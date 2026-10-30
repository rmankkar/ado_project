import React, { useMemo, useState } from 'react';
import type { TestCase, SortField, SortDirection } from '../types/ado.js';
import { getStatusBadgeClass } from '../utils/formatters.js';
import { LoadingSpinner } from './LoadingSpinner.js';
import { InfoAlert } from './ErrorAlert.js';
import { exportToExcel, sanitizeForExcel } from '../utils/exportToExcel.js';

interface TestCaseTableProps {
  testCases: TestCase[];
  isLoading: boolean;
  selectedIteration: string;
  onSort: (field: SortField) => void;
  sortState: { field: SortField; direction: SortDirection };
}

interface FilterState {
  status: string;
  assignedTo: string;
  complexity: string;
  searchText: string;
}

export function TestCaseTable({
  testCases,
  isLoading,
  selectedIteration,
  onSort,
  sortState,
}: TestCaseTableProps) {
  const hasSelectedIteration = selectedIteration.length > 0;
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    assignedTo: '',
    complexity: '',
    searchText: '',
  });

  // Complexity sort order: Simple, Medium, Complex, Not Defined
  const complexityOrder = ['Simple', 'Medium', 'Complex', 'Not Defined'];

  // Get unique values for filter dropdowns
  const uniqueStatuses = useMemo((): string[] =>
    [...new Set(testCases.map(s => s.status).filter(Boolean))].sort(),
    [testCases]
  );
  const uniqueAssignees = useMemo((): string[] =>
    [...new Set(testCases.map(s => s.assignedTo).filter((v): v is string => v !== null))].sort(),
    [testCases]
  );
  const uniqueComplexities = useMemo((): string[] => {
    const complexities = [...new Set(testCases.map(s => s.complexity).filter((v): v is string => v !== null))];
    // Sort by complexity order
    return complexities.sort((a, b) => {
      const indexA = complexityOrder.indexOf(a);
      const indexB = complexityOrder.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [testCases]);

  // Apply filters and sorting
  const filteredAndSortedTestCases = useMemo(() => {
    let result = [...testCases];

    // Apply text filters
    if (filters.status) {
      result = result.filter(s => s.status === filters.status);
    }
    if (filters.assignedTo) {
      result = result.filter(s => s.assignedTo === filters.assignedTo);
    }
    if (filters.complexity) {
      result = result.filter(s => s.complexity === filters.complexity);
    }
    // Apply search text filter (case-insensitive search on title, tags, or ID)
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      result = result.filter(s =>
        s.title.toLowerCase().includes(searchLower) ||
        (s.tags && s.tags.toLowerCase().includes(searchLower)) ||
        s.id.toString().includes(searchLower)
      );
    }

    // Apply sorting
    const { field, direction } = sortState;
    result.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (field) {
        case 'id':
          aVal = a.id;
          bVal = b.id;
          break;
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'status':
          aVal = a.status.toLowerCase();
          bVal = b.status.toLowerCase();
          break;
        case 'assignedTo':
          aVal = (a.assignedTo ?? '').toLowerCase();
          bVal = (b.assignedTo ?? '').toLowerCase();
          break;
        case 'complexity':
          const complexityOrderMap: Record<string, number> = { 'Simple': 0, 'Medium': 1, 'Complex': 2, 'Not Defined': 3 };
          aVal = complexityOrderMap[a.complexity ?? ''] ?? 99;
          bVal = complexityOrderMap[b.complexity ?? ''] ?? 99;
          break;
        case 'createdBy':
          aVal = (a.createdBy ?? '').toLowerCase();
          bVal = (b.createdBy ?? '').toLowerCase();
          break;
        case 'parentUserStory':
          const aParent = a.parentUserStories?.[0];
          const bParent = b.parentUserStories?.[0];
          aVal = `${aParent?.id ?? 0} ${aParent?.title ?? ''}`.toLowerCase();
          bVal = `${bParent?.id ?? 0} ${bParent?.title ?? ''}`.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [testCases, sortState, filters]);

  const handleSort = (field: SortField) => {
    onSort(field);
  };

  const getSortIcon = (field: SortField) => {
    if (sortState.field !== field) return null;
    return sortState.direction === 'asc' ? '▲' : '▼';
  };

  const handleExport = () => {
    const columns = [
      { header: 'ID', key: 'id', width: 12 },
      { header: 'Title', key: 'title', width: 50 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Complexity', key: 'complexity', width: 15 },
      { header: 'Tags', key: 'tags', width: 30, render: (v: string | null | undefined) => sanitizeForExcel(v) },
      { header: 'Assigned To', key: 'assignedTo', width: 25 },
      { header: 'Created By', key: 'createdBy', width: 25 },
      { header: 'Parent User Stories', key: 'parentUserStories', width: 40, render: (v: { id: number; title: string }[] | null | undefined) => v?.map((p) => `${p.id} - ${p.title}`).join(', ') ?? '' },
    ];

    const data = filteredAndSortedTestCases.map(tc => ({
      id: tc.id,
      title: tc.title,
      status: tc.status,
      complexity: tc.complexity ?? '',
      tags: tc.tags ?? '',
      assignedTo: tc.assignedTo ?? '',
      createdBy: tc.createdBy ?? '',
      parentUserStories: tc.parentUserStories,
    }));

    exportToExcel({
      filename: `TestCases_Export_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Test Cases',
      columns,
      data,
    });
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ status: '', assignedTo: '', complexity: '', searchText: '' });
  };

  const hasActiveFilters = filters.status || filters.assignedTo || filters.complexity || filters.searchText;

  if (isLoading) {
    return (
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Status</th>
              <th>Complexity</th>
              <th>Tags</th>
              <th>Assigned To</th>
              <th>Created By</th>
              <th>Parent User Story</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                <td><LoadingSpinner size="sm" /></td>
                <td><div className="h-4 bg-neutral-200 rounded w-48 animate-pulse" /></td>
                <td><div className="h-4 bg-neutral-200 rounded w-24 animate-pulse" /></td>
                <td><div className="h-4 bg-neutral-200 rounded w-24 animate-pulse" /></td>
                <td><div className="h-4 bg-neutral-200 rounded w-32 animate-pulse" /></td>
                <td><div className="h-4 bg-neutral-200 rounded w-24 animate-pulse" /></td>
                <td><div className="h-4 bg-neutral-200 rounded w-28 animate-pulse" /></td>
                <td><div className="h-4 bg-neutral-200 rounded w-36 animate-pulse" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!hasSelectedIteration) {
    return (
      <InfoAlert
        message="Select an Iteration from the dropdown above, then click 'Get Test Cases' to retrieve test cases linked to User Stories in that iteration."
        type="info"
      />
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-neutral-900">
          Test Cases ({filteredAndSortedTestCases.length} of {testCases.length})
        </h2>
        <button
          onClick={handleExport}
          className="btn-secondary text-sm"
          title="Export to Excel"
          disabled={filteredAndSortedTestCases.length === 0}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export
        </button>
      </div>

      {/* Filter Controls */}
      <div className="mb-4 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-neutral-700">Search Title:</label>
            <input
              type="text"
              value={filters.searchText}
              onChange={(e) => handleFilterChange('searchText', e.target.value)}
              placeholder="Search title or ID..."
              className="text-sm border border-neutral-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-primary-500 w-64"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-neutral-700">Status:</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="text-sm border border-neutral-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-neutral-700">Complexity:</label>
            <select
              value={filters.complexity}
              onChange={(e) => handleFilterChange('complexity', e.target.value)}
              className="text-sm border border-neutral-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All</option>
              {uniqueComplexities.map(complexity => (
                <option key={complexity} value={complexity}>{complexity}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-neutral-700">Assigned To:</label>
            <select
              value={filters.assignedTo}
              onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
              className="text-sm border border-neutral-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All</option>
              {uniqueAssignees.map(assignee => (
                <option key={assignee} value={assignee}>{assignee}</option>
              ))}
            </select>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-primary-600 hover:text-primary-700 underline-offset-2 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="table-container scrollbar-thin">
        <table className="table" role="grid">
          <thead>
            <tr>
              <th scope="col" className="cursor-pointer select-none" onClick={() => handleSort('id')}>
                <div className="flex items-center gap-1">
                  ID
                  {getSortIcon('id') && <span className="text-neutral-400">{getSortIcon('id')}</span>}
                </div>
              </th>
              <th scope="col" className="cursor-pointer select-none" onClick={() => handleSort('title')}>
                <div className="flex items-center gap-1">
                  Title
                  {getSortIcon('title') && <span className="text-neutral-400">{getSortIcon('title')}</span>}
                </div>
              </th>
              <th scope="col" className="cursor-pointer select-none" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-1">
                  Status
                  {getSortIcon('status') && <span className="text-neutral-400">{getSortIcon('status')}</span>}
                </div>
              </th>
              <th scope="col" className="cursor-pointer select-none" onClick={() => handleSort('complexity')}>
                <div className="flex items-center gap-1">
                  Complexity
                  {getSortIcon('complexity') && <span className="text-neutral-400">{getSortIcon('complexity')}</span>}
                </div>
              </th>
              <th scope="col" className="cursor-pointer select-none" onClick={() => handleSort('tags')}>
                <div className="flex items-center gap-1">
                  Tags
                  {getSortIcon('tags') && <span className="text-neutral-400">{getSortIcon('tags')}</span>}
                </div>
              </th>
              <th scope="col" className="cursor-pointer select-none" onClick={() => handleSort('assignedTo')}>
                <div className="flex items-center gap-1">
                  Assigned To
                  {getSortIcon('assignedTo') && <span className="text-neutral-400">{getSortIcon('assignedTo')}</span>}
                </div>
              </th>
              <th scope="col" className="cursor-pointer select-none" onClick={() => handleSort('createdBy')}>
                <div className="flex items-center gap-1">
                  Created By
                  {getSortIcon('createdBy') && <span className="text-neutral-400">{getSortIcon('createdBy')}</span>}
                </div>
              </th>
              <th scope="col" className="cursor-pointer select-none" onClick={() => handleSort('parentUserStory')}>
                <div className="flex items-center gap-1">
                  Parent User Story
                  {getSortIcon('parentUserStory') && <span className="text-neutral-400">{getSortIcon('parentUserStory')}</span>}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedTestCases.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-neutral-500">
                  No test cases found for the selected iteration. This could mean there are no test cases linked to User Stories in this iteration.
                </td>
              </tr>
            ) : (
              filteredAndSortedTestCases.map(testCase => (
              <tr key={`${testCase.id}-${testCase.parentUserStories?.[0]?.id ?? 'none'}`}>
                <td className="font-mono font-medium">
                  <a
                    href={testCase.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 underline-offset-2 hover:underline"
                  >
                    {testCase.id}
                  </a>
                </td>
                <td className="max-w-md whitespace-normal break-words" title={testCase.title}>
                  {testCase.title}
                </td>
                <td>
                  <span className={getStatusBadgeClass(testCase.status)}>
                    {testCase.status}
                  </span>
                </td>
                <td className="text-neutral-600">
                  {testCase.complexity ?? '—'}
                </td>
                <td className="text-neutral-600 max-w-xs" title={testCase.tags ?? ''}>
                  {testCase.tags ?? '—'}
                </td>
                <td className="text-neutral-600">
                  {testCase.assignedTo ?? '—'}
                </td>
                <td className="font-mono text-sm text-neutral-600">
                  {testCase.createdBy ?? '—'}
                </td>
                <td className="font-mono text-sm text-neutral-600">
                  {testCase.parentUserStories && testCase.parentUserStories.length > 0 ? (
                    <span title={testCase.parentUserStories.map(p => p.title).join(', ')}>
                      {testCase.parentUserStories.map((parent, index) => (
                        <React.Fragment key={parent.id}>
                          <a
                            href={parent.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700 underline-offset-2 hover:underline"
                            title={parent.title}
                          >
                            {parent.id}
                          </a>
                          {index < testCase.parentUserStories.length - 1 && <span className="text-neutral-400 mx-1">,</span>}
                        </React.Fragment>
                      ))}
                    </span>
                  ) : (
                    <span>—</span>
                  )}
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
    </div>
  );
}