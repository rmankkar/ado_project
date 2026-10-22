import { Router } from 'express';
import { env } from '../config/env.js';
import type { HealthResponse } from '../types/api.js';

const router = Router();

router.get('/',
  (_req, res) => {
    const response: HealthResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      adoConfigured: !!(env.adoOrgUrl && env.adoProject && env.adoPat),
    };
    res.json(response);
  }
);

export default router;