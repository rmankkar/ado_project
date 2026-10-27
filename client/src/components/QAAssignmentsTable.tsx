import { useMemo, useState } from 'react';
import type { ChildUserStory, SortField, SortDirection, Bug } from '../types/ado.js';
import { getStatusBadgeClass, formatDate, isDateInPast } from '../utils/formatters.js';
import { LoadingSpinner } from './LoadingSpinner.js';
import { InfoAlert } from './ErrorAlert.js';

interface QAAssignmentsTableProps {
  userStories: ChildUserStory[];
  isLoading: boolean;
  selectedIteration: string;
  onSort: (field: SortField) => void;
  sortState: { field: SortField; direction: SortDirection };
}

interface FilterState {
  status: string;
  assignedTo: string;
  boardColumn: string;
  parentFeature: string;
  searchText: string;
}

export function QAAssignmentsTable({
  userStories,
  isLoading,
  selectedIteration,
  onSort,
  sortState,
}: QAAssignmentsTableProps) {
  const hasSelectedIteration = selectedIteration.length > 0;
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    assignedTo: '',
    boardColumn: '',
    parentFeature: '',
    searchText: '',
  });
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Get unique values for filter dropdowns
  const uniqueStatuses = useMemo((): string[] =>
    [...new Set(userStories.map(s => s.status).filter(Boolean))].sort(),
    [userStories]
  );
  const uniqueAssignees = useMemo((): string[] =>
    [...new Set(userStories.map(s => s.assignedTo).filter((v): v is string => v !== null))].sort(),
    [userStories]
  );
  const uniqueBoardColumns = useMemo((): string[] =>
    [...new Set(userStories.map(s => s.boardColumn).filter((v): v is string => v !== null))].sort(),
    [userStories]
  );
  const uniqueParentFeatures = useMemo((): string[] =>
    [...new Set(userStories.map(s => `${s.parentFeature.id} - ${s.parentFeature.title}`))].sort(),
    [userStories]
  );

  // Apply filters and sorting
  const filteredAndSortedStories = useMemo(() => {
    let result = [...userStories];

    // Apply text filters
    if (filters.status) {
      result = result.filter(s => s.status === filters.status);
    }
    if (filters.assignedTo) {
      result = result.filter(s => s.assignedTo === filters.assignedTo);
    }
    if (filters.boardColumn) {
      result = result.filter(s => s.boardColumn === filters.boardColumn);
    }
    if (filters.parentFeature) {
      result = result.filter(s => `${s.parentFeature.id} - ${s.parentFeature.title}` === filters.parentFeature);
    }
    // Apply search text filter (case-insensitive search on title)
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      result = result.filter(s => s.title.toLowerCase().includes(searchLower));
    }

    // Apply sorting
    const { field, direction } = sortState;
    result.sort((a, b) => {
      let aVal: string | number | Date;
      let bVal: string | number | Date;

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
        case 'boardColumn':
          aVal = (a.boardColumn ?? '').toLowerCase();
          bVal = (b.boardColumn ?? '').toLowerCase();
          break;
        case 'deployDate':
          aVal = a.deployDate ? new Date(a.deployDate) : new Date(0);
          bVal = b.deployDate ? new Date(b.deployDate) : new Date(0);
          break;
        case 'targetDate':
          aVal = a.targetDate ? new Date(a.targetDate) : new Date(0);
          bVal = b.targetDate ? new Date(b.targetDate) : new Date(0);
          break;
        case 'parentFeature':
          aVal = `${a.parentFeature.id} ${a.parentFeature.title}`.toLowerCase();
          bVal = `${b.parentFeature.id} ${b.parentFeature.title}`.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [userStories, sortState, filters]);

  const handleSort = (field: SortField) => {
    onSort(field);
  };

  const getSortIcon = (field: SortField) => {
    if (sortState.field !== field) return null;
    return sortState.direction === 'asc' ? '▲' : '▼';
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ status: '', assignedTo: '', boardColumn: '', parentFeature: '', searchText: '' });
  };

  const hasActiveFilters = filters.status || filters.assignedTo || filters.boardColumn || filters.parentFeature || filters.searchText;

  const toggleExpand = (storyId: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(storyId)) {
        next.delete(storyId);
      } else {
        next.add(storyId);
      }
      return next;
    });
  };

  const renderBugRows = (bugs: Bug[]) => {
    if (bugs.length === 0) {
      return [
        <tr key="no-bugs" className="bg-neutral-100">
          <td colSpan={8} className="px-4 py-3 text-center text-neutral-500 text-sm">
            No active bugs linked to this User Story
          </td>
        </tr>
      ];
    }

    return bugs.map(bug => (
      <tr key={bug.id} className="bg-neutral-100 border-t border-neutral-200">
        <td className="px-4 py-2 font-mono text-sm text-primary-600">
          <a
            href={bug.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 underline-offset-2 hover:underline"
          >
            {bug.id}
          </a>
        </td>
        <td className="px-4 py-2 max-w-md whitespace-normal break-words text-sm" title={bug.title}>
          {bug.title}
        </td>
        <td className="px-4 py-2">
          <span className={getStatusBadgeClass(bug.status)}>
            {bug.status}
          </span>
        </td>
        <td className="px-4 py-2 text-sm text-neutral-600">
          {bug.assignedTo ?? '—'}
        </td>
        <td className="px-4 py-2 text-sm text-neutral-600">
          {bug.boardColumn ?? '—'}
        </td>
        <td className="px-4 py-2 text-sm text-neutral-600"></td>
        <td className="px-4 py-2 text-sm text-neutral-600"></td>
        <td className="px-4 py-2 text-sm text-neutral-600"></td>
      </tr>
    ));
  };

  if (isLoading) {
    return (
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Status</th>
              <th>Assigned To</th>
              <th>Board Column</th>
              <th>Deploy Date</th>
              <th>Target Date</th>
              <th>Parent Feature</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                <td><LoadingSpinner size="sm" /></td>
                <td><div className="h-4 bg-neutral-200 rounded w-48 animate-pulse" /></td>
                <td><div className="h-4 bg-neutral-200 rounded w-24 animate-pulse" /></td>
                <td><div className="h-4 bg-neutral-200 rounded w-32 animate-pulse" /></td>
                <td><div className="h-4 bg-neutral-200 rounded w-28 animate-pulse" /></td>
                <td><div className="h-4 bg-neutral-200 rounded w-24 animate-pulse" /></td>
                <td><div className="h-4 bg-neutral-200 rounded w-24 animate-pulse" /></td>
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
        message="Select an Iteration from the dropdown above, then click 'Get QA US' to retrieve User Stories assigned to QA team members or in 'In Progress(QA)' column."
        type="info"
      />
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-neutral-900">
          QA Assignments ({filteredAndSortedStories.length} of {userStories.length})
        </h2>
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
              placeholder="Search user story title..."
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
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-neutral-700">Board Column:</label>
            <select
              value={filters.boardColumn}
              onChange={(e) => handleFilterChange('boardColumn', e.target.value)}
              className="text-sm border border-neutral-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All</option>
              {uniqueBoardColumns.map(column => (
                <option key={column} value={column}>{column}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-neutral-700">Parent Feature:</label>
            <select
              value={filters.parentFeature}
              onChange={(e) => handleFilterChange('parentFeature', e.target.value)}
              className="text-sm border border-neutral-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-primary-500 w-64"
            >
              <option value="">All</option>
              {uniqueParentFeatures.map(feature => (
                <option key={feature} value={feature}>{feature}</option>
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
              <th scope="col" className="cursor-pointer select-none" onClick={() => handleSort('assignedTo')}>
                <div className="flex items-center gap-1">
                  Assigned To
                  {getSortIcon('assignedTo') && <span className="text-neutral-400">{getSortIcon('assignedTo')}</span>}
                </div>
              </th>
              <th scope="col" className="cursor-pointer select-none" onClick={() => handleSort('boardColumn')}>
                <div className="flex items-center gap-1">
                  Board Column
                  {getSortIcon('boardColumn') && <span className="text-neutral-400">{getSortIcon('boardColumn')}</span>}
                </div>
              </th>
              <th scope="col" className="cursor-pointer select-none" onClick={() => handleSort('deployDate')}>
                <div className="flex items-center gap-1">
                  Deploy Date
                  {getSortIcon('deployDate') && <span className="text-neutral-400">{getSortIcon('deployDate')}</span>}
                </div>
              </th>
              <th scope="col" className="cursor-pointer select-none" onClick={() => handleSort('targetDate')}>
                <div className="flex items-center gap-1">
                  Target Date
                  {getSortIcon('targetDate') && <span className="text-neutral-400">{getSortIcon('targetDate')}</span>}
                </div>
              </th>
              <th scope="col" className="cursor-pointer select-none" onClick={() => handleSort('parentFeature')}>
                <div className="flex items-center gap-1">
                  Parent Feature
                  {getSortIcon('parentFeature') && <span className="text-neutral-400">{getSortIcon('parentFeature')}</span>}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedStories.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-neutral-500">
                  No QA User Stories found for the selected iteration. This could mean there are no User Stories assigned to QA team members or in 'In Progress(QA)' column.
                </td>
              </tr>
            ) : (
              filteredAndSortedStories.flatMap(story => {
                const isExpanded = expandedRows.has(story.id);
                const hasBugs = story.bugs && story.bugs.length > 0;

                const rows: React.ReactNode[] = [
                  // Main User Story row
                  <tr key={`${story.id}-${story.parentFeature.id}`}>
                    <td className="font-mono font-medium">
                      <a
                        href={story.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 underline-offset-2 hover:underline"
                      >
                        {story.id}
                      </a>
                    </td>
                    <td className="max-w-md whitespace-normal break-words" title={story.title}>
                      <div className="flex items-center gap-2">
                        {hasBugs && (
                          <button
                            onClick={() => toggleExpand(story.id)}
                            className="flex items-center justify-center w-6 h-6 text-neutral-400 hover:text-neutral-600 transition-colors"
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                            aria-expanded={isExpanded}
                          >
                            <svg
                              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )}
                        <span>{story.title}</span>
                        {hasBugs && (
                          <span className="text-xs text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                            {story.bugs!.length} bug{story.bugs!.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={getStatusBadgeClass(story.status)}>
                        {story.status}
                      </span>
                    </td>
                    <td className="text-neutral-600">
                      {story.assignedTo ?? '—'}
                    </td>
                    <td className="text-neutral-600">
                      {story.boardColumn ?? '—'}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: isDateInPast(story.deployDate, story.status) ? '#dc2626' : '#4b5563', fontWeight: isDateInPast(story.deployDate, story.status) ? 600 : 400 }}>
                      {formatDate(story.deployDate)}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: isDateInPast(story.targetDate, story.status) ? '#dc2626' : '#4b5563', fontWeight: isDateInPast(story.targetDate, story.status) ? 600 : 400 }}>
                      {formatDate(story.targetDate)}
                    </td>
                    <td className="font-mono text-sm text-neutral-600">
                      <a
                        href={story.parentFeature.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 underline-offset-2 hover:underline"
                        title={story.parentFeature.title}
                      >
                        {story.parentFeature.id}
                      </a>
                    </td>
                  </tr>,
                ];

                // Add expanded bug rows if expanded and has bugs
                if (isExpanded && hasBugs) {
                  rows.push(...renderBugRows(story.bugs!));
                }

                return rows;
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}