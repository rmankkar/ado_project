import { useState, FormEvent } from 'react';
import { parseFeatureIds, validateFeatureIds } from '../utils/validation.js';
import type { FetchError, ReleaseItem } from '../types/ado.js';
import { ErrorAlert } from './ErrorAlert.js';

interface FeatureInputProps {
  onFetch: (ids: number[]) => void;
  onReport: () => void;
  isFetching: boolean;
  isReporting: boolean;
  hasFeatures: boolean;
  fetchErrors: FetchError[];
  onDismissErrors: () => void;
  // Release features section
  onFetchReleaseFeatures: (releaseIds: number[]) => void;
  onLoadReleases: () => void;
  isFetchingReleaseFeatures: boolean;
  isLoadingReleases: boolean;
  hasReleaseFeatures: boolean;
  releaseFeaturesFetchErrors: FetchError[];
  onDismissReleaseFeaturesErrors: () => void;
  // Release data for dropdown
  releases: ReleaseItem[];
  selectedReleaseIds: number[];
  onReleaseSelectionChange: (ids: number[]) => void;
}

export function FeatureInput({
  onFetch,
  onReport,
  isFetching,
  isReporting,
  hasFeatures,
  fetchErrors,
  onDismissErrors,
  onFetchReleaseFeatures,
  onLoadReleases,
  isFetchingReleaseFeatures,
  isLoadingReleases,
  hasReleaseFeatures,
  releaseFeaturesFetchErrors,
  onDismissReleaseFeaturesErrors,
  releases,
  selectedReleaseIds,
  onReleaseSelectionChange,
}: FeatureInputProps) {
  const [input, setInput] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const { ids, errors } = parseFeatureIds(input);
    const validationErrs = validateFeatureIds(ids);
    const allErrors = [...errors, ...validationErrs];

    if (allErrors.length > 0) {
      setValidationErrors(allErrors);
      return;
    }

    setValidationErrors([]);
    onFetch(ids);
  };

  const handleReport = () => {
    if (hasFeatures) {
      onReport();
    }
  };

  const handleReleaseReport = () => {
    if (hasReleaseFeatures) {
      onReport();
    }
  };

  const handleReleaseSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions);
    const ids = selectedOptions.map(opt => parseInt(opt.value, 10)).filter(id => !isNaN(id));
    onReleaseSelectionChange(ids);
  };

  return (
    <section className="card p-6 mb-6">
      {/* Feature IDs Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900">Option 1: Feature IDs</h3>
        {fetchErrors.length > 0 && (
          <ErrorAlert errors={fetchErrors} title="Previous Fetch Errors" onDismiss={onDismissErrors} />
        )}

        {validationErrors.length > 0 && (
          <ErrorAlert
            errors={validationErrors.map((msg, i) => ({ id: i, message: msg, type: 'api_error' as const }))}
            title="Input Validation Errors"
            onDismiss={() => setValidationErrors([])}
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="feature-ids" className="block text-sm font-medium text-neutral-700 mb-2">
              Feature IDs (comma-separated)
            </label>
            <textarea
              id="feature-ids"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g., 12345, 12346, 12347"
              rows={3}
              className="input font-mono text-sm"
              disabled={isFetching}
              aria-describedby="feature-ids-help"
            />
            <p id="feature-ids-help" className="mt-1 text-sm text-neutral-500">
              Enter one or more Azure DevOps Feature work item IDs separated by commas.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="btn-primary"
              disabled={isFetching || !input.trim()}
            >
              {isFetching ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Fetching...
                </>
              ) : (
                'Fetch Data'
              )}
            </button>

            <button
              type="button"
              onClick={handleReport}
              className="btn-secondary"
              disabled={isReporting || !hasFeatures}
            >
              {isReporting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-neutral-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </>
              ) : (
                'Get Report'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* OR Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white text-neutral-500 font-medium">OR</span>
        </div>
      </div>

      {/* Release Features Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-neutral-900">Option 2: Select Release</h3>
        {releaseFeaturesFetchErrors.length > 0 && (
          <ErrorAlert errors={releaseFeaturesFetchErrors} title="Previous Fetch Errors" onDismiss={onDismissReleaseFeaturesErrors} />
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="release-select" className="block text-sm font-medium text-neutral-700 mb-2">
              Select Release(s) (with "blackhawks" tag, not Closed/Completed/Rejected)
            </label>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <select
                  id="release-select"
                  className="input"
                  multiple
                  value={selectedReleaseIds.map(String)}
                  onChange={handleReleaseSelectionChange}
                  disabled={isLoadingReleases || isFetchingReleaseFeatures || releases.length === 0}
                >
                  {releases.length === 0 ? (
                    <option value="">-- Click "Load Releases" to fetch available releases --</option>
                  ) : (
                    <>
                      <option value="">-- Select one or more Releases --</option>
                      {releases.map(release => (
                        <option key={release.id} value={release.id}>
                          {release.title} ({release.state})
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <p className="mt-1 text-sm text-neutral-500">
                  Hold Ctrl/Cmd to select multiple releases. Features and User Stories will be fetched for selected releases.
                </p>
              </div>
              <button
                type="button"
                onClick={onLoadReleases}
                className="btn-secondary whitespace-nowrap"
                disabled={isLoadingReleases}
              >
                {isLoadingReleases ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-neutral-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading...
                  </>
                ) : (
                  'Load Releases'
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onFetchReleaseFeatures(selectedReleaseIds)}
              className="btn-primary"
              disabled={isFetchingReleaseFeatures || selectedReleaseIds.length === 0}
            >
              {isFetchingReleaseFeatures ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Fetching...
                </>
              ) : (
                'Fetch Data'
              )}
            </button>

            <button
              type="button"
              onClick={handleReleaseReport}
              className="btn-secondary"
              disabled={isReporting || !hasReleaseFeatures}
            >
              {isReporting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-neutral-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </>
              ) : (
                'Get Report'
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}