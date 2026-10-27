import { useMemo, useRef, useEffect, useState } from 'react';
import type { Feature, ChildUserStory, SortField, SortDirection } from '../types/ado.js';
import { getStatusBadgeClass, isDateInPast, formatDate } from '../utils/formatters.js';
import { LoadingSpinner } from './LoadingSpinner.js';
import { InfoAlert } from './ErrorAlert.js';

interface FeatureTableProps {
  features: Feature[];
  isLoading: boolean;
  selectedIds: Set<number>;
  onSelectAll: () => void;
  onSelectOne: (id: number) => void;
  onSort: (field: SortField) => void;
  sortState: { field: SortField; direction: SortDirection };
  // Optional: for release features flow - map of featureId -> child stories
  featureChildStories?: Map<number, ChildUserStory[]>;
}

export function FeatureTable({
  features,
  isLoading,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onSort,
  sortState,
  featureChildStories,
}: FeatureTableProps) {
  const allSelected = features.length > 0 && features.every(f => selectedIds.has(f.id));
  const someSelected = features.some(f => selectedIds.has(f.id));
  const [expandedFeatures, setExpandedFeatures] = useState<Set<number>>(new Set());

  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [someSelected, allSelected]);

  const sortedFeatures = useMemo(() => {
    const { field, direction } = sortState;
    return [...features].sort((a, b) => {
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
        default:
          return 0;
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [features, sortState]);

  const handleSort = (field: SortField) => {
    onSort(field);
  };

  const getSortIcon = (field: SortField) => {
    if (sortState.field !== field) return null;
    return sortState.direction === 'asc' ? '▲' : '▼';
  };

  const toggleExpand = (featureId: number) => {
    setExpandedFeatures(prev => {
      const next = new Set(prev);
      if (next.has(featureId)) {
        next.delete(featureId);
      } else {
        next.add(featureId);
      }
      return next;
    });
  };

  const hasChildStories = (featureId: number) => {
    return featureChildStories ? featureChildStories.has(featureId) && (featureChildStories.get(featureId)?.length ?? 0) > 0 : false;
  };

  const getChildStories = (featureId: number) => {
    return featureChildStories?.get(featureId) ?? [];
  };

  if (isLoading) {
    return (
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="w-12"></th>
              <th>ID</th>
              <th>Title</th>
              <th>Status</th>
              <th>Assigned To</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                <td className="w-12"><LoadingSpinner size="sm" /></td>
                <td><div className="h-4 bg-neutral-200 rounded w-20 animate-pulse" /></td>
                <td><div className="h-4 bg-neutral-200 rounded w-48 animate-pulse" /></td>
                <td><div className="h-4 bg-neutral-200 rounded w-24 animate-pulse" /></td>
                <td><div className="h-4 bg-neutral-200 rounded w-32 animate-pulse" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (features.length === 0) {
    return (
      <InfoAlert
        message="No Features found. Enter Feature IDs above and click 'Fetch Data' to retrieve them."
        type="info"
      />
    );
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-neutral-900">
          Features ({features.length})
        </h2>
        <div className="text-sm text-neutral-500">
          {selectedIds.size} selected
        </div>
      </div>

      <div className="table-container scrollbar-thin">
        <table className="table" role="grid">
          <thead>
            <tr>
              <th className="w-12">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={onSelectAll}
                  className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                  aria-label={allSelected ? 'Deselect all' : 'Select all'}
                />
              </th>
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
            </tr>
          </thead>
          <tbody>
            {sortedFeatures.map(feature => (
              <>
                <tr key={feature.id}>
                  <td className="w-12">
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(feature.id)}
                        onChange={() => onSelectOne(feature.id)}
                        className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                        aria-label={`Select Feature ${feature.id}`}
                      />
                      {featureChildStories && hasChildStories(feature.id) && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(feature.id)}
                          className="flex items-center justify-center w-8 h-8 rounded hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          aria-label={expandedFeatures.has(feature.id) ? `Collapse Feature ${feature.id}` : `Expand Feature ${feature.id}`}
                          aria-expanded={expandedFeatures.has(feature.id)}
                        >
                          {expandedFeatures.has(feature.id) ? (
                            <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="font-mono font-medium">
                    <a
                      href={feature.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 underline-offset-2 hover:underline"
                    >
                      {feature.id}
                    </a>
                  </td>
                  <td className="whitespace-normal break-words" title={feature.title}>
                    {feature.title}
                  </td>
                  <td>
                    <span className={getStatusBadgeClass(feature.status)}>
                      {feature.status}
                    </span>
                  </td>
                  <td className="text-neutral-600">
                    {feature.assignedTo ?? '—'}
                  </td>
                </tr>
                {featureChildStories && hasChildStories(feature.id) && expandedFeatures.has(feature.id) && (
                  <tr key={`${feature.id}-expanded`}>
                    <td colSpan={5} className="p-0">
                      <div className="bg-neutral-50 border-t border-neutral-200">
                        <table className="table w-full">
                          <thead>
                            <tr className="text-xs text-neutral-500 uppercase tracking-wider bg-neutral-100">
                              <th className="px-4 py-2 text-left">ID</th>
                              <th className="px-4 py-2 text-left">Title</th>
                              <th className="px-4 py-2 text-left">Status</th>
                              <th className="px-4 py-2 text-left">Assigned To</th>
                              <th className="px-4 py-2 text-left">Board Column</th>
                              <th className="px-4 py-2 text-left">Deploy Date</th>
                              <th className="px-4 py-2 text-left">Target Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getChildStories(feature.id).map(story => (
                              <tr key={story.id} className="hover:bg-neutral-100">
                                <td className="px-4 py-2 font-mono text-sm">
                                  <a
                                    href={story.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary-600 hover:text-primary-700 underline-offset-2 hover:underline"
                                  >
                                    {story.id}
                                  </a>
                                </td>
                                <td className="px-4 py-2 text-sm whitespace-normal break-words" title={story.title}>
                                  {story.title}
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  <span className={getStatusBadgeClass(story.status)}>
                                    {story.status}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-sm text-neutral-600">
                                  {story.assignedTo ?? '—'}
                                </td>
                                <td className="px-4 py-2 text-sm text-neutral-600">
                                  {story.boardColumn ?? '—'}
                                </td>
                                <td className="px-4 py-2 text-sm font-mono" style={{ color: isDateInPast(story.deployDate, story.status) ? '#dc2626' : '#4b5563' }}>
                                  {formatDate(story.deployDate)}
                                </td>
                                <td className="px-4 py-2 text-sm font-mono" style={{ color: isDateInPast(story.targetDate, story.status) ? '#dc2626' : '#4b5563' }}>
                                  {formatDate(story.targetDate)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}