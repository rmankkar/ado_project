import { useMemo, useState } from 'react';
import type { ChildUserStory, SortField, SortDirection, Comment, FetchCommentsResponse } from '../types/ado.js';
import { getStatusBadgeClass, formatDate, isDateInPast } from '../utils/formatters.js';
import { LoadingSpinner } from './LoadingSpinner.js';
import { InfoAlert } from './ErrorAlert.js';
import { CommentModal } from './CommentModal.js';
import { useFetchComments } from '../hooks/useComments.js';
import { exportToExcel, formatDateForExport } from '../utils/exportToExcel.js';

interface ChildStoryTableProps {
  childStories: ChildUserStory[];
  isLoading: boolean;
  isFetching: boolean;
  onFetch: () => void;
  selectedFeatureIds: Set<number>;
  onSort: (field: SortField) => void;
  sortState: { field: SortField; direction: SortDirection };
}

interface FilterState {
  status: string;
  assignedTo: string;
  boardColumn: string;
  hideRemoved: boolean;
  searchText: string;
  iterationPath: string;
}

export function ChildStoryTable({
  childStories,
  isLoading,
  isFetching,
  onFetch,
  selectedFeatureIds,
  onSort,
  sortState,
}: ChildStoryTableProps) {
  const hasSelectedFeatures = selectedFeatureIds.size > 0;
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    assignedTo: '',
    boardColumn: '',
    hideRemoved: true,
    searchText: '',
    iterationPath: '',
  });
  const [selectedItem, setSelectedItem] = useState<{ id: number; title: string; type: 'us' } | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const fetchCommentsMutation = useFetchComments({
    onSuccess: (data: FetchCommentsResponse) => {
      setComments(data.comments);
      setIsLoadingComments(false);
    },
    onError: (error: Error) => {
      console.error('Failed to fetch comments:', error);
      setComments([]);
      setIsLoadingComments(false);
    },
  });

  const handleOpenComments = (item: { id: number; title: string; type: 'us' }) => {
    setSelectedItem(item);
    setComments([]);
    setIsLoadingComments(true);
    fetchCommentsMutation.mutate(item.id);
  };

  const handleCloseComments = () => {
    setSelectedItem(null);
    setComments([]);
    fetchCommentsMutation.reset();
  };

  const handleFetch = () => {
    setHasAttemptedFetch(true);
    onFetch();
  };

  // Get unique values for filter dropdowns
  const uniqueStatuses = useMemo((): string[] =>
    [...new Set(childStories.map(s => s.status).filter(Boolean))].sort(),
    [childStories]
  );
  const uniqueAssignees = useMemo((): string[] =>
    [...new Set(childStories.map(s => s.assignedTo).filter((v): v is string => v !== null))].sort(),
    [childStories]
  );
  const uniqueBoardColumns = useMemo((): string[] =>
    [...new Set(childStories.map(s => s.boardColumn).filter((v): v is string => v !== null))].sort(),
    [childStories]
  );
  const uniqueIterationPaths = useMemo((): string[] =>
    [...new Set(childStories.map(s => s.iterationPath).filter((v): v is string => v !== null))].sort(),
    [childStories]
  );

  // Apply filters and sorting
  const filteredAndSortedStories = useMemo(() => {
    let result = [...childStories];

    // Filter out "Removed" status if enabled
    if (filters.hideRemoved) {
      result = result.filter(s => s.status.toLowerCase() !== 'removed');
    }

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
    if (filters.iterationPath) {
      result = result.filter(s => s.iterationPath === filters.iterationPath);
    }
    // Apply search text filter (case-insensitive search on title or ID)
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      result = result.filter(s => s.title.toLowerCase().includes(searchLower) || s.id.toString().includes(searchLower));
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
        case 'iterationPath':
          aVal = (a.iterationPath ?? '').toLowerCase();
          bVal = (b.iterationPath ?? '').toLowerCase();
          break;
        case 'storyPoints':
          aVal = a.storyPoints ?? 0;
          bVal = b.storyPoints ?? 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [childStories, sortState, filters]);

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
      { header: 'Assigned To', key: 'assignedTo', width: 25 },
      { header: 'Board Column', key: 'boardColumn', width: 20 },
      { header: 'Deploy Date', key: 'deployDate', width: 15, render: (v: string | null | undefined) => formatDateForExport(v) },
      { header: 'Target Date', key: 'targetDate', width: 15, render: (v: string | null | undefined) => formatDateForExport(v) },
      { header: 'Iteration Path', key: 'iterationPath', width: 30 },
      { header: 'Story Points', key: 'storyPoints', width: 15 },
      { header: 'Parent Feature', key: 'parentFeature', width: 30, render: (v: { id: number; title: string } | null | undefined) => v ? `${v.id} - ${v.title}` : '' },
    ];

    const data = filteredAndSortedStories.map(s => ({
      id: s.id,
      title: s.title,
      status: s.status,
      assignedTo: s.assignedTo ?? '',
      boardColumn: s.boardColumn ?? '',
      deployDate: s.deployDate,
      targetDate: s.targetDate,
      iterationPath: s.iterationPath ?? '',
      storyPoints: s.storyPoints ?? '',
      parentFeature: s.parentFeature,
    }));

    exportToExcel({
      filename: `ChildUserStories_Export_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Child User Stories',
      columns,
      data,
    });
  };

  const handleFilterChange = (key: keyof FilterState, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ status: '', assignedTo: '', boardColumn: '', hideRemoved: true, searchText: '', iterationPath: '' });
  };

  const hasActiveFilters = filters.status || filters.assignedTo || filters.boardColumn || filters.hideRemoved || filters.searchText || filters.iterationPath;

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
              <th>Iteration Path</th>
              <th>Story Points</th>
              <th>Parent Feature</th>
              <th>Comments</th>
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
                <td><div className="h-4 bg-neutral-200 rounded w-24 animate-pulse" /></td>
                <td><div className="h-4 bg-neutral-200 rounded w-36 animate-pulse" /></td>
                <td><div className="h-4 bg-neutral-200 rounded w-12 animate-pulse" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!hasSelectedFeatures) {
    return (
      <InfoAlert
        message="Select one or more Features from the table above, then click 'Fetch Child User Stories' to retrieve their child User Stories."
        type="info"
      />
    );
  }

  // Show table with button when features selected (regardless of childStories)
  // "No results" message goes in tbody after fetch attempted
  return (
    <>
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-neutral-900">
          Child User Stories ({filteredAndSortedStories.length} of {childStories.length})
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="btn-secondary text-sm"
            title="Export to Excel"
            disabled={filteredAndSortedStories.length === 0}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <button
          onClick={handleFetch}
          className="btn-secondary"
          disabled={isFetching || !hasSelectedFeatures}
        >
          {isFetching ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-neutral-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Fetching...
            </>
          ) : (
            'Fetch Child User Stories'
          )}
        </button>
      </div>
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
            <label className="text-sm font-medium text-neutral-700">Iteration Path:</label>
            <select
              value={filters.iterationPath}
              onChange={(e) => handleFilterChange('iterationPath', e.target.value)}
              className="text-sm border border-neutral-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-primary-500 w-96"
            >
              <option value="">All</option>
              {uniqueIterationPaths.map(path => (
                <option key={path} value={path}>{path}</option>
              ))}
            </select>
            {filters.iterationPath && (
              <button
                onClick={() => handleFilterChange('iterationPath', '')}
                className="text-sm text-primary-600 hover:text-primary-700 underline-offset-2 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hideRemoved"
              checked={filters.hideRemoved}
              onChange={(e) => handleFilterChange('hideRemoved', e.target.checked)}
              className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="hideRemoved" className="text-sm text-neutral-700">Hide Removed</label>
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
              <th scope="col" className="cursor-pointer select-none" onClick={() => handleSort('iterationPath')}>
                <div className="flex items-center gap-1">
                  Iteration Path
                  {getSortIcon('iterationPath') && <span className="text-neutral-400">{getSortIcon('iterationPath')}</span>}
                </div>
              </th>
              <th scope="col" className="cursor-pointer select-none" onClick={() => handleSort('storyPoints')}>
                <div className="flex items-center gap-1">
                  Story Points
                  {getSortIcon('storyPoints') && <span className="text-neutral-400">{getSortIcon('storyPoints')}</span>}
                </div>
              </th>
              <th scope="col" className="cursor-pointer select-none" onClick={() => handleSort('parentFeature')}>
                <div className="flex items-center gap-1">
                  Parent Feature
                  {getSortIcon('parentFeature') && <span className="text-neutral-400">{getSortIcon('parentFeature')}</span>}
                </div>
              </th>
              <th scope="col">Comments</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedStories.length === 0 && hasAttemptedFetch ? (
              <tr>
                <td colSpan={11} className="text-center py-8 text-neutral-500">
                  No child User Stories found for the selected Features. This could mean the Features have no children, or the children are not of type 'User Story'.
                </td>
              </tr>
            ) : (
              filteredAndSortedStories.map(story => (
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
                <td className="whitespace-normal break-words" title={story.title}>
                  {story.title}
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
                <td className="text-neutral-600 text-sm">
                  {story.iterationPath ?? '—'}
                </td>
                <td className="text-neutral-600 text-center font-mono">
                  {story.storyPoints !== null && story.storyPoints !== undefined ? story.storyPoints : '—'}
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
                <td className="text-center">
                  <button
                    onClick={() => handleOpenComments({ id: story.id, title: story.title, type: 'us' })}
                    className="text-2xl hover:text-primary-600 transition-colors p-1"
                    aria-label={`View comments for user story ${story.id}`}
                    title="View comments"
                  >
                    💬
                  </button>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
    </div>

      <CommentModal
        isOpen={selectedItem !== null}
        onClose={handleCloseComments}
        workItemId={selectedItem?.id ?? 0}
        workItemTitle={selectedItem?.title ?? ''}
        comments={comments}
        isLoading={isLoadingComments}
      />
    </>
  );
}