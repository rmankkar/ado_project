import { Router } from 'express';
import { fetchBugs } from '../services/bugService.js';
import { validate } from '../middleware/validation.js';
import { z } from 'zod';
import type { FetchBugsResponse } from '../types/api.js';

const fetchBugsSchema = z.object({
  body: z.object({
    iterationPath: z.string().min(1, 'Iteration path is required'),
  }),
});

const router = Router();

router.post('/',
  validate(fetchBugsSchema),
  async (req, res) => {
    console.log('Received request to fetch bugs for iteration:', req.body.iterationPath);
    const { iterationPath } = req.body;
    const result = await fetchBugs(iterationPath);

    const response: FetchBugsResponse = {
      bugs: result.bugs,
      errors: result.errors,
    };

    res.json(response);
  }
);

export default router;