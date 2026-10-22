import { useState, useMemo } from 'react';
import { useFetchIterations, useIterations, useIterationErrors } from '../hooks/useIterations.js';
import { useFetchBugs, useBugs, useBugErrors, useClearBugs } from '../hooks/useBugs.js';
import { BugTable } from './BugTable.js';
import { StatusPieChart } from './StatusPieChart.js';
import { LoadingOverlay } from './LoadingSpinner.js';
import type { SortField, SortDirection, StatusCount } from '../types/ado.js';

export function IterationBugsTab() {
  const [selectedIterationPath, setSelectedIterationPath] = useState('');
  const [sortState, setSortState] = useState<{ field: SortField; direction: SortDirection }>({ field: 'id', direction: 'asc' });

  const fetchIterationsMutation = useFetchIterations();
  const iterations = useIterations();
  const iterationErrors = useIterationErrors();

  const fetchBugsMutation = useFetchBugs();
  const bugs = useBugs();
  const bugErrors = useBugErrors();
  const clearBugs = useClearBugs();

  const isFetchingIterations = fetchIterationsMutation.isPending;
  const isFetchingBugs = fetchBugsMutation.isPending;

  const handleFetchIterations = () => {
    fetchIterationsMutation.mutate();
  };

  const handleFetchBugs = () => {
    fetchBugsMutation.mutate(selectedIterationPath);
  };

  const handleSort = (field: SortField) => {
    setSortState(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Compute bug status counts for the pie chart (excluding Closed/Removed)
  const bugStatusCounts = useMemo((): StatusCount[] => {
    const statusMap = new Map<string, number>();
    for (const bug of bugs) {
      const status = bug.status.toLowerCase();
      if (status === 'closed' || status === 'removed') continue;
      statusMap.set(bug.status, (statusMap.get(bug.status) ?? 0) + 1);
    }
    return Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [bugs]);

  const totalOpenBugs = bugs.filter(b => {
    const s = b.status.toLowerCase();
    return s !== 'closed' && s !== 'removed';
  }).length;

  const allErrors = [...iterationErrors, ...bugErrors];

  return (
    <div className="space-y-6">
      {/* Iteration Selector */}
      <div className="card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex-1">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Select Iteration
            </label>
            <div className="relative">
              <select
                value={selectedIterationPath}
                onChange={(e) => {
                  setSelectedIterationPath(e.target.value);
                  clearBugs();
                }}
                disabled={isFetchingIterations}
                className="w-full md:w-96 px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-50 disabled:cursor-not-allowed appearance-none"
              >
                <option value="">-- Select an Iteration --</option>
                {iterations.map(iteration => (
                  <option key={iteration.path} value={iteration.path}>
                    {iteration.path} {iteration.startDate && iteration.finishDate ? `(${formatDate(iteration.startDate)} - ${formatDate(iteration.finishDate)})` : ''}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleFetchIterations}
              className="btn-secondary"
              disabled={isFetchingIterations}
            >
              {isFetchingIterations ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-neutral-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading...
                </>
              ) : (
                'Load Iterations'
              )}
            </button>

            <button
              onClick={handleFetchBugs}
              className="btn-primary"
              disabled={isFetchingBugs || !selectedIterationPath}
            >
              {isFetchingBugs ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Fetching...
                </>
              ) : (
                'Get Open Bugs'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Errors */}
      {allErrors.length > 0 && (
        <div className="card p-4" role="alert">
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

      {/* Bug Status Pie Chart */}
      {selectedIterationPath && (totalOpenBugs > 0 || bugs.length > 0) && (
        <div className="card p-6">
          <StatusPieChart
            title="Open Bug Status Distribution (Closed/Removed excluded)"
            data={bugStatusCounts}
            total={totalOpenBugs}
            height={300}
          />
        </div>
      )}

      {/* Bug Table */}
      <BugTable
        bugs={bugs}
        isLoading={isFetchingBugs}
        isFetching={isFetchingBugs}
        onFetch={handleFetchBugs}
        selectedIteration={selectedIterationPath}
        onSort={handleSort}
        sortState={sortState}
      />

      {(isFetchingIterations || isFetchingBugs) && (
        <LoadingOverlay message={isFetchingIterations ? 'Loading Iterations...' : 'Fetching Open Bugs...'} />
      )}
    </div>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}