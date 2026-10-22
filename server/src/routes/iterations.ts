import { Router } from 'express';
import { fetchIterations } from '../services/iterationService.js';
import type { FetchIterationsResponse } from '../types/api.js';

const router = Router();

router.get('/',
  async (_req, res) => {
    const result = await fetchIterations();

    const response: FetchIterationsResponse = {
      iterations: result.iterations,
      errors: result.errors,
    };

    res.json(response);
  }
);

export default router;