import { useMemo, useState } from 'react';
import type { Bug, SortField, SortDirection } from '../types/ado.js';
import { getStatusBadgeClass, formatDate, getBugAgeLabel } from '../utils/formatters.js';
import { LoadingSpinner } from './LoadingSpinner.js';
import { InfoAlert } from './ErrorAlert.js';

interface BugTableProps {
  bugs: Bug[];
  isLoading: boolean;
  selectedIteration: string;
  onSort: (field: SortField) => void;
  sortState: { field: SortField; direction: SortDirection };
}

interface FilterState {
  status: string;
  assignedTo: string;
  goLive: string;
  severity: string;
  searchText: string;
}

export function BugTable({
  bugs,
  isLoading,
  selectedIteration,
  onSort,
  sortState,
}: BugTableProps) {
  const hasSelectedIteration = selectedIteration.length > 0;
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    assignedTo: '',
    goLive: '',
    severity: '',
    searchText: '',
  });

  // Get unique values for filter dropdowns
  const uniqueStatuses = useMemo((): string[] =>
    [...new Set(bugs.map(s => s.status).filter(Boolean))].sort(),
    [bugs]
  );
  const uniqueAssignees = useMemo((): string[] =>
    [...new Set(bugs.map(s => s.assignedTo).filter((v): v is string => v !== null))].sort(),
    [bugs]
  );
  const uniqueGoLive = useMemo((): string[] =>
    [...new Set(bugs.map(s => s.goLive).filter((v): v is string => v !== null))].sort(),
    [bugs]
  );
  const uniqueSeverities = useMemo((): string[] =>
    [...new Set(bugs.map(s => s.severity).filter((v): v is string => v !== null))].sort(),
    [bugs]
  );

  // Apply filters and sorting
  const filteredAndSortedBugs = useMemo(() => {
    let result = [...bugs];

    // Apply text filters
    if (filters.status) {
      result = result.filter(s => s.status === filters.status);
    }
    if (filters.assignedTo) {
      result = result.filter(s => s.assignedTo === filters.assignedTo);
    }
    if (filters.goLive) {
      result = result.filter(s => s.goLive === filters.goLive);
    }
    if (filters.severity) {
      result = result.filter(s => s.severity === filters.severity);
    }
    // Apply search text filter (case-insensitive search on title)
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      result = result.filter(s => s.title.toLowerCase().includes(searchLower));
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
        case 'goLive':
          aVal = (a.goLive ?? '').toLowerCase();
          bVal = (b.goLive ?? '').toLowerCase();
          break;
        case 'severity':
          aVal = (a.severity ?? '').toLowerCase();
          bVal = (b.severity ?? '').toLowerCase();
          break;
        case 'priority':
          aVal = a.priority ?? 0;
          bVal = b.priority ?? 0;
          break;
        case 'createdDate':
          aVal = a.createdDate ?? '';
          bVal = b.createdDate ?? '';
          break;
        case 'parentUserStory':
          aVal = `${a.parentUserStory?.id ?? 0} ${a.parentUserStory?.title ?? ''}`.toLowerCase();
          bVal = `${b.parentUserStory?.id ?? 0} ${b.parentUserStory?.title ?? ''}`.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [bugs, sortState, filters]);

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
    setFilters({ status: '', assignedTo: '', goLive: '', severity: '', searchText: '' });
  };

  const hasActiveFilters = filters.status || filters.assignedTo || filters.goLive || filters.severity || filters.searchText;

  if (isLoading) {
    return (
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Status</th>
              <th>Severity</th>
              <th>Priority</th>
              <th>Assigned To</th>
              <th>Go Live</th>
              <th>Created</th>
              <th>Parent User Story</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                <td><LoadingSpinner size="sm" /></td>
                <td><div className="h-4 bg-neutral-200 rounded w-48 animate-pulse" /></td>
                <td><div className="h-4 bg-neutral-200 rounded w-24 animate-pulse" /></td>
                <td><div className="h-4 bg-neutral-200 rounded w-20 animate-pulse" /></td>
                <td><div className="h-4 bg-neutral-200 rounded w-16 animate-pulse" /></td>
                <td><div className="h-4 bg-neutral-200 rounded w-24 animate-pulse" /></td>
                <td><div className="h-4 bg-neutral-200 rounded w-28 animate-pulse" /></td>
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
        message="Select an Iteration from the dropdown above, then click 'Get Open Bugs' to retrieve bugs linked to User Stories in that iteration."
        type="info"
      />
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-neutral-900">
          Open Bugs ({filteredAndSortedBugs.length} of {bugs.length})
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
              placeholder="Search bug title..."
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
            <label className="text-sm font-medium text-neutral-700">Severity:</label>
            <select
              value={filters.severity}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
              className="text-sm border border-neutral-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All</option>
              {uniqueSeverities.map(severity => (
                <option key={severity} value={severity}>{severity}</option>
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
            <label className="text-sm font-medium text-neutral-700">Go Live:</label>
            <select
              value={filters.goLive}
              onChange={(e) => handleFilterChange('goLive', e.target.value)}
              className="text-sm border border-neutral-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All</option>
              {uniqueGoLive.map(goLive => (
                <option key={goLive} value={goLive}>{goLive}</option>
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
              <th scope="col" className="cursor-pointer select-none" onClick={() => handleSort('severity')}>
                <div className="flex items-center gap-1">
                  Severity
                  {getSortIcon('severity') && <span className="text-neutral-400">{getSortIcon('severity')}</span>}
                </div>
              </th>
              <th scope="col" className="cursor-pointer select-none" onClick={() => handleSort('priority')}>
                <div className="flex items-center gap-1">
                  Priority
                  {getSortIcon('priority') && <span className="text-neutral-400">{getSortIcon('priority')}</span>}
                </div>
              </th>
              <th scope="col" className="cursor-pointer select-none" onClick={() => handleSort('assignedTo')}>
                <div className="flex items-center gap-1">
                  Assigned To
                  {getSortIcon('assignedTo') && <span className="text-neutral-400">{getSortIcon('assignedTo')}</span>}
                </div>
              </th>
              <th scope="col" className="cursor-pointer select-none" onClick={() => handleSort('goLive')}>
                <div className="flex items-center gap-1">
                  Go Live
                  {getSortIcon('goLive') && <span className="text-neutral-400">{getSortIcon('goLive')}</span>}
                </div>
              </th>
              <th scope="col" className="cursor-pointer select-none" onClick={() => handleSort('createdDate')}>
                <div className="flex items-center gap-1">
                  Created
                  {getSortIcon('createdDate') && <span className="text-neutral-400">{getSortIcon('createdDate')}</span>}
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
            {filteredAndSortedBugs.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-neutral-500">
                  No open bugs found for the selected iteration. This could mean there are no bugs linked to User Stories in this iteration.
                </td>
              </tr>
            ) : (
              filteredAndSortedBugs.map(bug => (
              <tr key={`${bug.id}-${bug.parentUserStory?.id ?? 'none'}`}>
                <td className="font-mono font-medium">
                  <a
                    href={bug.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 underline-offset-2 hover:underline"
                  >
                    {bug.id}
                  </a>
                </td>
                <td className="max-w-md whitespace-normal break-words" title={bug.title}>
                  {bug.title}
                </td>
                <td>
                  <span className={getStatusBadgeClass(bug.status)}>
                    {bug.status}
                  </span>
                </td>
                <td className="text-neutral-600">
                  {bug.severity ?? '—'}
                </td>
                <td className="font-mono text-sm text-neutral-600">
                  {bug.priority ?? '—'}
                </td>
                <td className="text-neutral-600">
                  {bug.assignedTo ?? '—'}
                </td>
                <td className="text-neutral-600">
                  {bug.goLive ?? '—'}
                </td>
                <td className="font-mono text-sm text-neutral-600">
                  <div>{formatDate(bug.createdDate)}</div>
                  {getBugAgeLabel(bug.createdDate) && (
                    <span className={`inline-block mt-1 px-1.5 py-0.5 text-xs font-medium rounded ${getBugAgeLabel(bug.createdDate)!.className}`}>
                      {getBugAgeLabel(bug.createdDate)!.text}
                    </span>
                  )}
                </td>
                <td className="font-mono text-sm text-neutral-600">
                  {bug.parentUserStory ? (
                    <a
                      href={bug.parentUserStory.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 underline-offset-2 hover:underline"
                      title={bug.parentUserStory.title}
                    >
                      {bug.parentUserStory.id}
                    </a>
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