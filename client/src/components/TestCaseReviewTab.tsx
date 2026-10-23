import { useState, useMemo } from 'react';
import { useFetchIterations, useIterations, useIterationErrors } from '../hooks/useIterations.js';
import { useFetchTestCases, useTestCases, useTestCaseErrors, useClearTestCases } from '../hooks/useTestCases.js';
import { TestCaseTable } from './TestCaseTable.js';
import { StatusPieChart } from './StatusPieChart.js';
import { LoadingOverlay } from './LoadingSpinner.js';
import type { SortField, SortDirection, StatusCount } from '../types/ado.js';

export function TestCaseReviewTab() {
  const [selectedIterationPath, setSelectedIterationPath] = useState('');
  const [sortState, setSortState] = useState<{ field: SortField; direction: SortDirection }>({ field: 'id', direction: 'asc' });

  const fetchIterationsMutation = useFetchIterations();
  const iterations = useIterations();
  const iterationErrors = useIterationErrors();

  const fetchTestCasesMutation = useFetchTestCases();
  const testCases = useTestCases();
  const testCaseErrors = useTestCaseErrors();
  const clearTestCases = useClearTestCases();

  const isFetchingIterations = fetchIterationsMutation.isPending;
  const isFetchingTestCases = fetchTestCasesMutation.isPending;

  const handleFetchIterations = () => {
    fetchIterationsMutation.mutate();
  };

  const handleFetchTestCases = () => {
    fetchTestCasesMutation.mutate(selectedIterationPath);
  };

  const handleSort = (field: SortField) => {
    setSortState(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Compute test case status counts for the pie chart (excluding Closed/Removed)
  const testCaseStatusCounts = useMemo((): StatusCount[] => {
    const statusMap = new Map<string, number>();
    for (const tc of testCases) {
      const status = tc.status.toLowerCase();
      if (status === 'closed' || status === 'removed') continue;
      statusMap.set(tc.status, (statusMap.get(tc.status) ?? 0) + 1);
    }
    return Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [testCases]);

  const totalTestCases = testCases.filter(tc => {
    const s = tc.status.toLowerCase();
    return s !== 'closed' && s !== 'removed';
  }).length;

  // Compute unique User Story count (test cases with parentUserStories)
  const uniqueUserStoryCount = useMemo(() => {
    const userStoryIds = new Set<number>();
    for (const tc of testCases) {
      if (tc.parentUserStories && tc.parentUserStories.length > 0) {
        for (const parent of tc.parentUserStories) {
          userStoryIds.add(parent.id);
        }
      }
    }
    return userStoryIds.size;
  }, [testCases]);

  // Complexity sort order: Simple, Medium, Complex, Not Defined
  const complexityOrder = ['Simple', 'Medium', 'Complex', 'Not Defined'];

  // Compute complexity counts for the pie chart
  const testCaseComplexityCounts = useMemo((): StatusCount[] => {
    const complexityMap = new Map<string, number>();
    for (const tc of testCases) {
      const complexity = tc.complexity ?? 'Not Defined';
      complexityMap.set(complexity, (complexityMap.get(complexity) ?? 0) + 1);
    }
    return Array.from(complexityMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => {
        const indexA = complexityOrder.indexOf(a.status);
        const indexB = complexityOrder.indexOf(b.status);
        if (indexA === -1 && indexB === -1) return b.count - a.count;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
  }, [testCases]);

  // Compute assigned to counts for the pie chart
  const testCaseAssignedToCounts = useMemo((): StatusCount[] => {
    const assignedMap = new Map<string, number>();
    for (const tc of testCases) {
      const assigned = tc.assignedTo ?? 'Unassigned';
      assignedMap.set(assigned, (assignedMap.get(assigned) ?? 0) + 1);
    }
    return Array.from(assignedMap.entries())
      .map(([assigned, count]) => ({ status: assigned, count }))
      .sort((a, b) => b.count - a.count);
  }, [testCases]);

  const allErrors = [...iterationErrors, ...testCaseErrors];

  return (
    <div className="space-y-6">
      {/* Iteration Selector */}
      <div className="card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-4">
          <div className="flex-1 md:flex-none w-full md:w-96">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Select Iteration
            </label>
            <div className="relative">
              <select
                value={selectedIterationPath}
                onChange={(e) => {
                  setSelectedIterationPath(e.target.value);
                  clearTestCases();
                }}
                disabled={isFetchingIterations}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-neutral-50 disabled:cursor-not-allowed appearance-none pr-10"
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

          <div className="flex gap-3 w-full md:w-auto">
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
              onClick={handleFetchTestCases}
              className="btn-primary"
              disabled={isFetchingTestCases || !selectedIterationPath}
            >
              {isFetchingTestCases ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Fetching...
                </>
              ) : (
                'Get Test Cases'
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
      {selectedIterationPath && (totalTestCases > 0 || testCases.length > 0) && (
        <div className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-50 rounded-lg">
                <div className="text-2xl font-bold text-primary-700">{totalTestCases}</div>
                <div className="text-sm text-primary-600">Total Test Cases</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{uniqueUserStoryCount}</div>
                <div className="text-sm text-green-600">Unique User Stories</div>
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
      {selectedIterationPath && (totalTestCases > 0 || testCases.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Test Case Status Pie Chart */}
          <div className="card p-6">
            <StatusPieChart
              title="Test Case Status Distribution (Closed/Removed excluded)"
              data={testCaseStatusCounts}
              total={totalTestCases}
              height={280}
            />
          </div>

          {/* Complexity Pie Chart */}
          <div className="card p-6">
            <StatusPieChart
              title="Test Case Complexity Distribution"
              data={testCaseComplexityCounts}
              total={testCases.length}
              height={280}
            />
          </div>

          {/* Assigned To Pie Chart */}
          <div className="card p-6">
            <StatusPieChart
              title="Test Cases by Assignee"
              data={testCaseAssignedToCounts}
              total={testCases.length}
              height={280}
            />
          </div>
        </div>
      )}

      {/* Test Case Table */}
      <TestCaseTable
        testCases={testCases}
        isLoading={isFetchingTestCases}
        selectedIteration={selectedIterationPath}
        onSort={handleSort}
        sortState={sortState}
      />

      {(isFetchingIterations || isFetchingTestCases) && (
        <LoadingOverlay message={isFetchingIterations ? 'Loading Iterations...' : 'Fetching Test Cases...'} />
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