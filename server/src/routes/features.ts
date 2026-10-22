import { Router } from 'express';
import { fetchFeatures } from '../services/featureService.js';
import { validate } from '../middleware/validation.js';
import { fetchFeaturesSchema } from '../middleware/validation.js';
import type { FetchFeaturesResponse } from '../types/api.js';

const router = Router();

router.post('/',
  validate(fetchFeaturesSchema),
  async (_req, res) => {
    const { ids } = _req.body;
    const result = await fetchFeatures(ids);

    const response: FetchFeaturesResponse = {
      features: result.features,
      errors: result.errors,
    };

    res.json(response);
  }
);

export default router;