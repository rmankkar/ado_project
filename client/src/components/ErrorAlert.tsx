import type { FetchError } from '../types/ado.js';

interface ErrorAlertProps {
  errors: FetchError[];
  title?: string;
  onDismiss?: () => void;
}

export function ErrorAlert({ errors, title = 'Errors', onDismiss }: ErrorAlertProps) {
  if (errors.length === 0) return null;

  const getErrorIcon = (type: FetchError['type']) => {
    switch (type) {
      case 'not_found': return '🔍';
      case 'access_denied': return '🔒';
      case 'invalid_type': return '⚠️';
      case 'api_error': return '🔧';
      default: return '❓';
    }
  };

  return (
    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-red-500">⚠️</div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-red-800">{title}</h4>
          <ul className="mt-2 space-y-1 text-sm text-red-700">
            {errors.map((error, index) => (
              <li key={index} className="flex items-start gap-2">
                <span>{getErrorIcon(error.type)}</span>
                <span>
                  {error.id > 0 ? `ID ${error.id}: ` : ''}
                  {error.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-red-500 hover:text-red-700 transition-colors"
            aria-label="Dismiss errors"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

interface InfoAlertProps {
  message: string;
  type?: 'info' | 'warning' | 'success';
}

export function InfoAlert({ message, type = 'info' }: InfoAlertProps) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    success: 'bg-green-50 border-green-200 text-green-800',
  };

  const icons = {
    info: 'ℹ️',
    warning: '⚠️',
    success: '✅',
  };

  return (
    <div className={`p-4 rounded-lg border ${styles[type]}`} role="status">
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0">{icons[type]}</span>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}