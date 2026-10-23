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