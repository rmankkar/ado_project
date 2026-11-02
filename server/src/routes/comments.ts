import express from 'express';
import { fetchComments, fetchCommentsBatch } from '../services/commentService.js';
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

/**
 * GET /api/comments/batch?ids=1,2,3
 * Fetch the last comment date for multiple work items
 */
router.get('/batch', async (req, res) => {
  const idsParam = req.query.ids as string | undefined;

  if (!idsParam) {
    return res.status(400).json({
      lastCommentDates: [],
      errors: [{ id: 0, message: 'Missing "ids" query parameter', type: 'invalid_type' as const }],
    });
  }

  const ids = idsParam
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(id => !isNaN(id));

  if (ids.length === 0) {
    return res.status(400).json({
      lastCommentDates: [],
      errors: [{ id: 0, message: 'No valid work item IDs provided', type: 'invalid_type' as const }],
    });
  }

  try {
    const result = await fetchCommentsBatch(ids);
    res.json(result);
  } catch (error) {
    console.error('Error in batch comments route:', error);
    res.status(500).json({
      lastCommentDates: [],
      errors: [{ id: 0, message: 'Internal server error', type: 'api_error' as const }],
    });
  }
});

export default router;