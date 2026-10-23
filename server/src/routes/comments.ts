import express from 'express';
import { fetchComments } from '../services/commentService.js';
import type { FetchCommentsResponse } from '../types/api.js';

const router = express.Router();

/**
 * GET /api/comments/:workItemId
 * Fetch comments for a specific work item
 */
router.get('/:workItemId', async (req, res) => {
  const workItemId = parseInt(req.params.workItemId, 10);

  if (isNaN(workItemId)) {
    return res.status(400).json({
      comments: [],
      errors: [{ id: workItemId, message: 'Invalid work item ID', type: 'invalid_type' as const }],
    } satisfies FetchCommentsResponse);
  }

  try {
    const result = await fetchComments(workItemId);
    res.json(result);
  } catch (error) {
    console.error('Error in comments route:', error);
    res.status(500).json({
      comments: [],
      errors: [{ id: workItemId, message: 'Internal server error', type: 'api_error' as const }],
    } satisfies FetchCommentsResponse);
  }
});

export default router;