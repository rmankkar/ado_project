import { Router } from 'express';
import { fetchChildStories } from '../services/childStoryService.js';
import { validate } from '../middleware/validation.js';
import { fetchChildStoriesSchema } from '../middleware/validation.js';
import type { FetchChildStoriesResponse } from '../types/api.js';

const router = Router();

router.post('/',
  validate(fetchChildStoriesSchema),
  async (_req, res) => {
    const { featureIds } = _req.body;
    const result = await fetchChildStories(featureIds);

    const response: FetchChildStoriesResponse = {
      childStories: result.childStories,
      errors: result.errors,
    };

    res.json(response);
  }
);

export default router;