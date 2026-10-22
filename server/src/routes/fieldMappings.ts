import { Router } from 'express';
import { getFieldMappings } from '../services/fieldMapping.js';
import type { FieldMappingsResponse } from '../types/api.js';

const router = Router();

router.get('/',
  (_req, res) => {
    const mappings = getFieldMappings();
    const response: FieldMappingsResponse = {
      boardColumn: mappings.boardColumn,
      deployDate: mappings.deployDate,
      targetDate: mappings.targetDate,
    };
    res.json(response);
  }
);

export default router;