import { Router } from 'express';
import { fetchTestCases } from '../services/testCaseService.js';
import { validate } from '../middleware/validation.js';
import { z } from 'zod';
import type { FetchTestCasesResponse } from '../types/api.js';

const fetchTestCasesSchema = z.object({
  body: z.object({
    iterationPath: z.string().min(1, 'Iteration path is required'),
  }),
});

const router = Router();

router.post('/',
  validate(fetchTestCasesSchema),
  async (req, res) => {
    console.log('Received request to fetch test cases for iteration:', req.body.iterationPath);
    const { iterationPath } = req.body;
    const result = await fetchTestCases(iterationPath);

    const response: FetchTestCasesResponse = {
      testCases: result.testCases,
      errors: result.errors,
    };

    res.json(response);
  }
);

export default router;