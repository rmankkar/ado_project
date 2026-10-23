import { Router } from 'express';
import { z } from 'zod';
import { fetchQaUserStories } from '../services/qaService.js';

const router = Router();

const fetchQaUserStoriesSchema = z.object({
  iterationPath: z.string().min(1, 'Iteration path is required'),
});

router.post('/qa-user-stories', async (req, res) => {
  const parseResult = fetchQaUserStoriesSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      userStories: [],
      errors: [{ id: 0, message: 'Invalid request: iterationPath is required', type: 'api_error' as const }],
    });
  }

  const { iterationPath } = parseResult.data;
  const result = await fetchQaUserStories(iterationPath);

  res.json(result);
});

export default router;