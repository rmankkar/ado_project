import { useState, FormEvent } from 'react';
import { parseFeatureIds, validateFeatureIds } from '../utils/validation.js';
import type { FetchError } from '../types/ado.js';
import { ErrorAlert } from './ErrorAlert.js';

interface FeatureInputProps {
  onFetch: (ids: number[]) => void;
  onReport: () => void;
  isFetching: boolean;
  isReporting: boolean;
  hasFeatures: boolean;
  fetchErrors: FetchError[];
  onDismissErrors: () => void;
}

export function FeatureInput({
  onFetch,
  onReport,
  isFetching,
  isReporting,
  hasFeatures,
  fetchErrors,
  onDismissErrors,
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

  return (
    <section className="card p-6 mb-6">
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
    </section>
  );
}