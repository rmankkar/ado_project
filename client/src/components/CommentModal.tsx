import type { Comment } from '../types/ado.js';
import { formatDate, stripHtml } from '../utils/formatters.js';

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bugId: number;
  bugTitle: string;
  comments: Comment[];
  isLoading: boolean;
}

export function CommentModal({
  isOpen,
  onClose,
  bugId,
  bugTitle,
  comments,
  isLoading,
}: CommentModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-200">
            <h2 id="modal-title" className="text-lg font-semibold text-neutral-900">
              Comments for Bug #{bugId}
            </h2>
            <p className="text-sm text-neutral-500 truncate max-w-md ml-4" title={bugTitle}>
              {bugTitle}
            </p>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-600 transition-colors p-1"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[60vh] overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                <span className="sr-only">Loading comments...</span>
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                <svg className="w-12 h-12 mx-auto text-neutral-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p>No comments found for this bug.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-neutral-50 rounded-lg p-4 border border-neutral-200"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-700 font-medium text-sm">
                          {comment.createdBy?.charAt(0)?.toUpperCase() ?? '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-neutral-900">
                            {comment.createdBy ?? 'Unknown'}
                          </span>
                          <span className="text-sm text-neutral-500 whitespace-nowrap">
                            {formatDate(comment.createdDate)}
                          </span>
                          {comment.modifiedDate && comment.modifiedDate !== comment.createdDate && (
                            <span className="text-xs text-neutral-400 bg-neutral-200 px-1.5 py-0.5 rounded">
                              edited
                            </span>
                          )}
                        </div>
                        <div className="text-neutral-700 whitespace-pre-wrap text-sm leading-relaxed">
                          {stripHtml(comment.text)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end p-4 border-t border-neutral-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}