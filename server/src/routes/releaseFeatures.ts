import { Router } from 'express';
import { fetchReleases, fetchFeaturesFromRelease } from '../services/releaseService.js';
import type { FetchReleaseFeaturesResult, FetchReleasesResult } from '../services/releaseService.js';

const router = Router();

// GET /api/releases - Fetch releases for dropdown
router.get('/', async (_req, res) => {
  const result = await fetchReleases();

  const response: FetchReleasesResult = {
    releases: result.releases,
    errors: result.errors,
  };

  res.json(response);
});

// POST /api/release-features/from-release - Fetch features/user stories for selected releases
router.post('/from-release', async (req, res) => {
  const { releaseIds } = req.body as { releaseIds?: number[] };
  const result = await fetchFeaturesFromRelease(releaseIds);

  const response: FetchReleaseFeaturesResult = {
    releases: result.releases,
    errors: result.errors,
  };

  res.json(response);
});

export default router;