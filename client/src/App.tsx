import { useState, useCallback, useMemo } from 'react';
import { useFetchFeatures, useFeatures, useFetchErrors } from './hooks/useFeatures.js';
import { useFetchChildStories, useChildStories, useChildStoryErrors, useClearChildStories } from './hooks/useChildStories.js';
import { useFetchReleaseFeatures, useClearReleaseFeatures, useFetchReleases, useReleases } from './hooks/useReleaseFeatures.js';
import { Header } from './components/Header.js';
import { FeatureInput } from './components/FeatureInput.js';
import { FeatureTable } from './components/FeatureTable.js';
import { ChildStoryTable } from './components/ChildStoryTable.js';
import { ReportDashboard } from './components/ReportDashboard.js';
import { IterationBugsTab } from './components/IterationBugsTab.js';
import { TestCaseReviewTab } from './components/TestCaseReviewTab.js';
import { QAAssignmentsTab } from './components/QAAssignmentsTab.js';
import { Tabs } from './components/Tabs.js';
import { LoadingOverlay } from './components/LoadingSpinner.js';
import type { SortField, SortDirection, ReleaseWithFeatures, ChildUserStory } from './types/ado.js';

function App() {
  const [activeTab, setActiveTab] = useState<'features' | 'bugs' | 'testcases' | 'qaassignments'>('features');
  const [view, setView] = useState<'tables' | 'report'>('tables');
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<Set<number>>(new Set());
  const [sortState, setSortState] = useState<{ field: SortField; direction: SortDirection }>({ field: 'id', direction: 'asc' });
  const [childSortState, setChildSortState] = useState<{ field: SortField; direction: SortDirection }>({ field: 'id', direction: 'asc' });
  const [releaseFeaturesData, setReleaseFeaturesData] = useState<ReleaseWithFeatures[]>([]);
  const [selectedReleaseIds, setSelectedReleaseIds] = useState<number[]>([]);

  const fetchFeaturesMutation = useFetchFeatures();
  const features = useFeatures();
  const fetchErrors = useFetchErrors();

  const fetchChildStoriesMutation = useFetchChildStories();
  const childStories = useChildStories();
  const childStoryErrors = useChildStoryErrors();
  const clearChildStories = useClearChildStories();

  const fetchReleaseFeaturesMutation = useFetchReleaseFeatures();
  const fetchReleasesMutation = useFetchReleases();
  const releasesData = useReleases();
  const clearReleaseFeatures = useClearReleaseFeatures();

  const isFetchingFeatures = fetchFeaturesMutation.isPending;
  const isFetchingChildStories = fetchChildStoriesMutation.isPending;
  const isFetchingReleaseFeatures = fetchReleaseFeaturesMutation.isPending;
  const isLoadingReleases = fetchReleasesMutation.isPending;

  const handleFetchFeatures = useCallback((ids: number[]) => {
    setView('tables');
    clearChildStories();
    clearReleaseFeatures();
    setReleaseFeaturesData([]);
    fetchFeaturesMutation.mutate(ids);
  }, [fetchFeaturesMutation, clearChildStories, clearReleaseFeatures]);

  const handleFetchChildStories = useCallback(() => {
    fetchChildStoriesMutation.mutate(Array.from(selectedFeatureIds));
  }, [fetchChildStoriesMutation, selectedFeatureIds]);

  const handleLoadReleases = useCallback(async () => {
    try {
      await fetchReleasesMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to load releases:', error);
    }
  }, [fetchReleasesMutation]);

  const handleFetchReleaseFeatures = useCallback(async (releaseIds: number[]) => {
    setView('tables');
    clearChildStories();
    fetchFeaturesMutation.mutate([]); // Clear features
    setReleaseFeaturesData([]);
    clearReleaseFeatures();
    setSelectedReleaseIds(releaseIds);

    try {
      const result = await fetchReleaseFeaturesMutation.mutateAsync(releaseIds);
      if (result?.releases) {
        setReleaseFeaturesData(result.releases);
      }
    } catch (error) {
      console.error('Failed to fetch release features:', error);
    }
  }, [fetchFeaturesMutation, fetchReleaseFeaturesMutation, clearChildStories, clearReleaseFeatures]);

  const handleReport = useCallback(() => {
    setView('report');
  }, []);

  const hasFeatures = features.length > 0;
  const hasReleaseFeatures = releaseFeaturesData.length > 0;
  const combinedFeatures = hasReleaseFeatures ? releaseFeaturesData.flatMap(r => r.features) : features;
  const combinedChildStories = hasReleaseFeatures ? releaseFeaturesData.flatMap(r => r.childStories) : childStories;

  const handleSelectAll = useCallback(() => {
    if (selectedFeatureIds.size === combinedFeatures.length && combinedFeatures.length > 0) {
      setSelectedFeatureIds(new Set());
    } else {
      setSelectedFeatureIds(new Set(combinedFeatures.map(f => f.id)));
    }
  }, [selectedFeatureIds, combinedFeatures]);

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

  const handleReleaseSelectionChange = useCallback((ids: number[]) => {
    setSelectedReleaseIds(ids);
  }, []);

  const handleDismissFetchErrors = useCallback(() => {
    // Errors are cleared on next fetch
  }, []);

  // Build map of featureId -> child stories for expandable rows in release features mode
  const featureChildStories = useMemo(() => {
    if (!hasReleaseFeatures) return new Map<number, ChildUserStory[]>();
    const map = new Map<number, ChildUserStory[]>();
    for (const release of releaseFeaturesData) {
      for (const story of release.childStories) {
        const featureId = story.parentFeature.id;
        if (!map.has(featureId)) {
          map.set(featureId, []);
        }
        map.get(featureId)!.push(story);
      }
    }
    return map;
  }, [releaseFeaturesData, hasReleaseFeatures]);

  // Get releases for dropdown from cached data
  const releases = releasesData?.releases ?? [];

  // Filter child stories for insights: if features are selected, show only those features' child stories
  const insightChildStories = useMemo(() => {
    if (selectedFeatureIds.size > 0) {
      return combinedChildStories.filter(s => selectedFeatureIds.has(s.parentFeature?.id));
    }
    return combinedChildStories;
  }, [combinedChildStories, selectedFeatureIds]);

  // Specific board column counts for insight boxes
  const newColumnCount = useMemo(() => {
    return insightChildStories.filter(s => s.boardColumn?.toLowerCase() === 'new').length;
  }, [insightChildStories]);

  const blockedColumnCount = useMemo(() => {
    return insightChildStories.filter(s => s.boardColumn?.toLowerCase() === 'blocked').length;
  }, [insightChildStories]);

  const inProgressQaColumnCount = useMemo(() => {
    return insightChildStories.filter(s => s.boardColumn?.toLowerCase() === 'in progress(qa)').length;
  }, [insightChildStories]);

  const committedColumnCount = useMemo(() => {
    return insightChildStories.filter(s => s.boardColumn?.toLowerCase() === 'committed').length;
  }, [insightChildStories]);

  const backlogColumnCount = useMemo(() => {
    return insightChildStories.filter(s => s.boardColumn?.toLowerCase() === 'backlog').length;
  }, [insightChildStories]);

  const inProgressDevColumnCount = useMemo(() => {
    return insightChildStories.filter(s => s.boardColumn?.toLowerCase() === 'in progress (dev)').length;
  }, [insightChildStories]);

  // New insight boxes for Closed and PO Review
  const closedColumnCount = useMemo(() => {
    return insightChildStories.filter(s => s.boardColumn?.toLowerCase() === 'closed').length;
  }, [insightChildStories]);

  const poReviewColumnCount = useMemo(() => {
    return insightChildStories.filter(s => s.boardColumn?.toLowerCase() === 'po review').length;
  }, [insightChildStories]);

  const totalChildStories = insightChildStories.length;

  const allErrors = [...fetchErrors, ...childStoryErrors];

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />

      {/* Tabs */}
      <Tabs tabs={[
        { id: 'features', label: 'Features & User Stories' },
        { id: 'bugs', label: 'Iteration Bugs' },
        { id: 'testcases', label: 'Test Case Review' },
        { id: 'qaassignments', label: 'QA Assignments' },
      ]} activeTab={activeTab} onChange={(tabId) => setActiveTab(tabId as 'features' | 'bugs' | 'testcases' | 'qaassignments')} />

      <main className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {allErrors.length > 0 && activeTab === 'features' && (
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

        {activeTab === 'features' ? (
          <>
            {view === 'tables' ? (
              <>
                <FeatureInput
                  onFetch={handleFetchFeatures}
                  onReport={handleReport}
                  isFetching={isFetchingFeatures}
                  isReporting={false}
                  hasFeatures={hasFeatures}
                  fetchErrors={[]}
                  onDismissErrors={handleDismissFetchErrors}
                  onFetchReleaseFeatures={handleFetchReleaseFeatures}
                  onLoadReleases={handleLoadReleases}
                  isFetchingReleaseFeatures={isFetchingReleaseFeatures}
                  isLoadingReleases={isLoadingReleases}
                  hasReleaseFeatures={hasReleaseFeatures}
                  releaseFeaturesFetchErrors={[]}
                  onDismissReleaseFeaturesErrors={handleDismissFetchErrors}
                  releases={releases}
                  selectedReleaseIds={selectedReleaseIds}
                  onReleaseSelectionChange={handleReleaseSelectionChange}
                />

                {/* Insights Section for Child User Stories - moved above Feature Table */}
                {totalChildStories > 0 && (
                  <div className="card p-4 mb-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary-50 rounded-lg">
                          <div className="text-2xl font-bold text-primary-700">{totalChildStories}</div>
                          <div className="text-sm text-primary-600">Total Child User Stories</div>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-700">{combinedFeatures.length}</div>
                          <div className="text-sm text-green-600">Parent Features</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Board Column Count Boxes */}
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="text-2xl font-bold text-blue-700">{newColumnCount}</div>
                          <div className="text-sm text-blue-600">Board Column: New</div>
                        </div>
                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                          <div className="text-2xl font-bold text-amber-700">{blockedColumnCount}</div>
                          <div className="text-sm text-amber-600">Board Column: Blocked</div>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                          <div className="text-2xl font-bold text-purple-700">{inProgressQaColumnCount}</div>
                          <div className="text-sm text-purple-600">Board Column: In Progress(QA)</div>
                        </div>
                        <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                          <div className="text-2xl font-bold text-indigo-700">{committedColumnCount}</div>
                          <div className="text-sm text-indigo-600">Board Column: Committed</div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="text-2xl font-bold text-slate-700">{backlogColumnCount}</div>
                          <div className="text-sm text-slate-600">Board Column: Backlog</div>
                        </div>
                        <div className="p-3 bg-teal-50 rounded-lg border border-teal-100">
                          <div className="text-2xl font-bold text-teal-700">{inProgressDevColumnCount}</div>
                          <div className="text-sm text-teal-600">Board Column: In Progress(DEV)</div>
                        </div>
                        <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                          <div className="text-2xl font-bold text-red-700">{closedColumnCount}</div>
                          <div className="text-sm text-red-600">Board Column: Closed</div>
                        </div>
                        <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                          <div className="text-2xl font-bold text-orange-700">{poReviewColumnCount}</div>
                          <div className="text-sm text-orange-600">Board Column: PO Review</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <FeatureTable
                  features={combinedFeatures}
                  isLoading={isFetchingFeatures || isFetchingReleaseFeatures}
                  selectedIds={selectedFeatureIds}
                  onSelectAll={handleSelectAll}
                  onSelectOne={handleSelectOne}
                  onSort={handleSort}
                  sortState={sortState}
                  featureChildStories={featureChildStories}
                />

                <ChildStoryTable
                  childStories={insightChildStories}
                  isLoading={isFetchingChildStories}
                  isFetching={isFetchingChildStories}
                  onFetch={handleFetchChildStories}
                  selectedFeatureIds={selectedFeatureIds}
                  onSort={handleChildSort}
                  sortState={childSortState}
                />
              </>
            ) : (
              <ReportDashboard
                onBack={() => setView('tables')}
                features={combinedFeatures}
                childStories={combinedChildStories}
              />
            )}
          </>
        ) : activeTab === 'bugs' ? (
          <IterationBugsTab />
        ) : activeTab === 'testcases' ? (
          <TestCaseReviewTab />
        ) : (
          <QAAssignmentsTab />
        )}
      </main>

      {(isFetchingFeatures || isFetchingChildStories || isFetchingReleaseFeatures || isLoadingReleases) && activeTab === 'features' && (
        <LoadingOverlay message={
          isLoadingReleases ? 'Loading Releases...' :
          isFetchingFeatures ? 'Fetching Features...' :
          isFetchingReleaseFeatures ? 'Fetching Release Features...' :
          'Fetching Child User Stories...'
        } />
      )}
    </div>
  );
}

export default App;