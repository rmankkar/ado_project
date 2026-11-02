import { adoClient } from './adoClient.js';
import { mapAdoCommentToComment } from '../types/api.js';
import type { Comment, FetchCommentsResponse, FetchError } from '../types/api.js';

/**
 * Fetch comments for a work item
 */
export async function fetchComments(workItemId: number): Promise<FetchCommentsResponse> {
  const errors: FetchError[] = [];

  try {
    const adoComments = await adoClient.getWorkItemComments(workItemId);
    const comments: Comment[] = adoComments.map(mapAdoCommentToComment);
    return { comments, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error fetching comments';
    errors.push({
      id: workItemId,
      message,
      type: 'api_error',
    });
    return { comments: [], errors };
  }
}

export interface LastCommentDate {
  workItemId: number;
  lastCommentDate: string | null;
}

/**
 * Fetch the last comment date for multiple work items
 */
export async function fetchCommentsBatch(ids: number[]): Promise<{ lastCommentDates: LastCommentDate[]; errors: FetchError[] }> {
  const lastCommentDates: LastCommentDate[] = [];
  const errors: FetchError[] = [];

  if (ids.length === 0) {
    return { lastCommentDates: [], errors: [] };
  }

  for (const id of ids) {
    try {
      const adoComments = await adoClient.getWorkItemComments(id);
      const comments = adoComments.map(mapAdoCommentToComment);

      if (comments.length === 0) {
        lastCommentDates.push({ workItemId: id, lastCommentDate: null });
      } else {
        // Sort by createdDate descending, take the first (most recent)
        const sorted = [...comments].sort((a, b) =>
          new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
        );
        lastCommentDates.push({ workItemId: id, lastCommentDate: sorted[0].createdDate });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error fetching comments';
      errors.push({
        id,
        message,
        type: 'api_error',
      });
      lastCommentDates.push({ workItemId: id, lastCommentDate: null });
    }
  }

  return { lastCommentDates, errors };
}