import { useState, useCallback } from 'react';
import { useFetchFeatures, useFeatures, useFetchErrors } from './hooks/useFeatures.js';
import { useFetchChildStories, useChildStories, useChildStoryErrors, useClearChildStories } from './hooks/useChildStories.js';
import { Header } from './components/Header.js';
import { FeatureInput } from './components/FeatureInput.js';
import { FeatureTable } from './components/FeatureTable.js';
import { ChildStoryTable } from './components/ChildStoryTable.js';
import { ReportDashboard } from './components/ReportDashboard.js';
import { LoadingOverlay } from './components/LoadingSpinner.js';
import type { SortField, SortDirection } from './types/ado.js';

function App() {
  const [view, setView] = useState<'tables' | 'report'>('tables');
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<Set<number>>(new Set());
  const [sortState, setSortState] = useState<{ field: SortField; direction: SortDirection }>({ field: 'id', direction: 'asc' });
  const [childSortState, setChildSortState] = useState<{ field: SortField; direction: SortDirection }>({ field: 'id', direction: 'asc' });

  const fetchFeaturesMutation = useFetchFeatures();
  const features = useFeatures();
  const fetchErrors = useFetchErrors();

  const fetchChildStoriesMutation = useFetchChildStories();
  const childStories = useChildStories();
  const childStoryErrors = useChildStoryErrors();
  const clearChildStories = useClearChildStories();

  const isFetchingFeatures = fetchFeaturesMutation.isPending;
  const isFetchingChildStories = fetchChildStoriesMutation.isPending;

  const handleFetchFeatures = useCallback((ids: number[]) => {
    setView('tables');
    clearChildStories();
    fetchFeaturesMutation.mutate(ids);
  }, [fetchFeaturesMutation, clearChildStories]);

  const handleFetchChildStories = useCallback(() => {
    fetchChildStoriesMutation.mutate(Array.from(selectedFeatureIds));
  }, [fetchChildStoriesMutation, selectedFeatureIds]);

  const handleReport = useCallback(() => {
    setView('report');
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedFeatureIds.size === features.length) {
      setSelectedFeatureIds(new Set());
    } else {
      setSelectedFeatureIds(new Set(features.map(f => f.id)));
    }
  }, [selectedFeatureIds, features]);

  const handleSelectOne = useCallback((id: number) => {
    setSelectedFeatureIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSort = useCallback((field: SortField) => {
    setSortState(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleChildSort = useCallback((field: SortField) => {
    setChildSortState(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleDismissFetchErrors = useCallback(() => {
    // Errors are cleared on next fetch
  }, []);

  const allErrors = [...fetchErrors, ...childStoryErrors];

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {allErrors.length > 0 && (
          <div className="mb-6" role="alert">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-red-800 mb-2">Errors</h4>
              <ul className="space-y-1 text-sm text-red-700">
                {allErrors.map((error, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span>⚠️</span>
                    <span>
                      {error.id > 0 ? `ID ${error.id}: ` : ''}
                      {error.message}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {view === 'tables' ? (
          <>
            <FeatureInput
              onFetch={handleFetchFeatures}
              onReport={handleReport}
              isFetching={isFetchingFeatures}
              isReporting={false}
              hasFeatures={features.length > 0}
              fetchErrors={[]}
              onDismissErrors={handleDismissFetchErrors}
            />

            <FeatureTable
              features={features}
              isLoading={isFetchingFeatures}
              selectedIds={selectedFeatureIds}
              onSelectAll={handleSelectAll}
              onSelectOne={handleSelectOne}
              onSort={handleSort}
              sortState={sortState}
            />

            <ChildStoryTable
              childStories={childStories}
              isLoading={isFetchingChildStories}
              isFetching={isFetchingChildStories}
              onFetch={handleFetchChildStories}
              selectedFeatureIds={selectedFeatureIds}
              onSort={handleChildSort}
              sortState={childSortState}
            />
          </>
        ) : (
          <ReportDashboard onBack={() => setView('tables')} />
        )}
      </main>

      {(isFetchingFeatures || isFetchingChildStories) && (
        <LoadingOverlay message={isFetchingFeatures ? 'Fetching Features...' : 'Fetching Child User Stories...'} />
      )}
    </div>
  );
}

export default App;