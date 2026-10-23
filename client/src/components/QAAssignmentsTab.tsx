import { useState, useMemo } from 'react';
import { useFetchIterations, useIterations, useIterationErrors } from '../hooks/useIterations.js';
import { useFetchQaUserStories, useQaUserStories, useQaUserStoriesErrors, useClearQaUserStories } from '../hooks/useQaUserStories.js';
import { QAAssignmentsTable } from './QAAssignmentsTable.js';
import { StatusPieChart } from './StatusPieChart.js';
import { LoadingOverlay } from './LoadingSpinner.js';
import type { SortField, SortDirection, StatusCount } from '../types/ado.js';

export function QAAssignmentsTab() {
  const [selectedIterationPath, setSelectedIterationPath] = useState('');
  const [sortState, setSortState] = useState<{ field: SortField; direction: SortDirection }>({ field: 'id', direction: 'asc' });

  const fetchIterationsMutation = useFetchIterations();
  const iterations = useIterations();
  const iterationErrors = useIterationErrors();

  const fetchQaUserStoriesMutation = useFetchQaUserStories();
  const userStories = useQaUserStories();
  const qaUserStoriesErrors = useQaUserStoriesErrors();
  const clearQaUserStories = useClearQaUserStories();

  const isFetchingIterations = fetchIterationsMutation.isPending;
  const isFetchingQaUserStories = fetchQaUserStoriesMutation.isPending;

  const handleFetchIterations = () => {
    fetchIterationsMutation.mutate();
  };

  const handleFetchQaUserStories = () => {
    fetchQaUserStoriesMutation.mutate(selectedIterationPath);
  };

  const handleSort = (field: SortField) => {
    setSortState(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Compute user story status counts for the pie chart (excluding Closed/Removed)
  const userStoryStatusCounts = useMemo((): StatusCount[] => {
    const statusMap = new Map<string, number>();
    for (const us of userStories) {
      const status = us.status.toLowerCase();
      if (status === 'closed' || status === 'removed') continue;
      statusMap.set(us.status, (statusMap.get(us.status) ?? 0) + 1);
    }
    return Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [userStories]);

  const totalQaUserStories = userStories.filter(us => {
    const s = us.status.toLowerCase();
    return s !== 'closed' && s !== 'removed';
  }).length;

  // Compute unique Parent Feature count
  const uniqueParentFeatureCount = useMemo(() => {
    const featureIds = new Set<number>();
    for (const us of userStories) {
      if (us.parentFeature?.id) {
        featureIds.add(us.parentFeature.id);
      }
    }
    return featureIds.size;
  }, [userStories]);

  // Compute board column counts for the pie chart
  const boardColumnCounts = useMemo((): StatusCount[] => {
    const columnMap = new Map<string, number>();
    for (const us of userStories) {
      const column = us.boardColumn ?? 'Unassigned';
      columnMap.set(column, (columnMap.get(column) ?? 0) + 1);
    }
    return Array.from(columnMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [userStories]);

  // Compute assigned to counts for the pie chart
  const assignedToCounts = useMemo((): StatusCount[] => {
    const assignedMap = new Map<string, number>();
    for (const us of userStories) {
      const assigned = us.assignedTo ?? 'Unassigned';
      assignedMap.set(assigned, (assignedMap.get(assigned) ?? 0) + 1);
    }
    return Array.from(assignedMap.entries())
      .map(([assigned, count]) => ({ status: assigned, count }))
      .sort((a, b) => b.count - a.count);
  }, [userStories]);

  const allErrors = [...iterationErrors, ...qaUserStoriesErrors];

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
                  clearQaUserStories();
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
              onClick={handleFetchQaUserStories}
              className="btn-primary"
              disabled={isFetchingQaUserStories || !selectedIterationPath}
            >
              {isFetchingQaUserStories ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Fetching...
                </>
              ) : (
                'Get QA US'
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

      {/* Insights Section */}
      {selectedIterationPath && (totalQaUserStories > 0 || userStories.length > 0) && (
        <div className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-50 rounded-lg">
                <div className="text-2xl font-bold text-primary-700">{totalQaUserStories}</div>
                <div className="text-sm text-primary-600">Total QA User Stories</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{uniqueParentFeatureCount}</div>
                <div className="text-sm text-green-600">Unique Parent Features</div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-neutral-600">
              <span className="px-3 py-1 bg-neutral-100 rounded">
                Iteration: <span className="font-medium text-neutral-900">{selectedIterationPath.split('\\').pop()}</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Pie Charts - 3 Columns */}
      {selectedIterationPath && (totalQaUserStories > 0 || userStories.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Story Status Pie Chart */}
          <div className="card p-6">
            <StatusPieChart
              title="User Story Status Distribution (Closed/Removed excluded)"
              data={userStoryStatusCounts}
              total={totalQaUserStories}
              height={280}
            />
          </div>

          {/* Board Column Pie Chart */}
          <div className="card p-6">
            <StatusPieChart
              title="User Stories by Board Column"
              data={boardColumnCounts}
              total={userStories.length}
              height={280}
            />
          </div>

          {/* Assigned To Pie Chart */}
          <div className="card p-6">
            <StatusPieChart
              title="User Stories by Assignee"
              data={assignedToCounts}
              total={userStories.length}
              height={280}
            />
          </div>
        </div>
      )}

      {/* QA User Stories Table */}
      <QAAssignmentsTable
        userStories={userStories}
        isLoading={isFetchingQaUserStories}
        selectedIteration={selectedIterationPath}
        onSort={handleSort}
        sortState={sortState}
      />

      {(isFetchingIterations || isFetchingQaUserStories) && (
        <LoadingOverlay message={isFetchingIterations ? 'Loading Iterations...' : 'Fetching QA User Stories...'} />
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