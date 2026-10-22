import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const fetchFeaturesSchema = z.object({
  body: z.object({
    ids: z.array(z.number().int().positive()).min(1, 'At least one ID is required').max(500, 'Too many IDs (max 500)'),
  }),
});

export const fetchChildStoriesSchema = z.object({
  body: z.object({
    featureIds: z.array(z.number().int().positive()).min(1, 'At least one Feature ID is required').max(500, 'Too many Feature IDs (max 500)'),
  }),
});

export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        });
        return;
      }
      next(error);
    }
  };
}