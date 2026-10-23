import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env, validateEnv } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import featuresRouter from './routes/features.js';
import childStoriesRouter from './routes/childStories.js';
import fieldMappingsRouter from './routes/fieldMappings.js';
import healthRouter from './routes/health.js';
import iterationsRouter from './routes/iterations.js';
import bugsRouter from './routes/bugs.js';
import testCasesRouter from './routes/testCases.js';
import qaAssignmentsRouter from './routes/qaAssignments.js';
import commentsRouter from './routes/comments.js';

validateEnv();

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
app.use(cors({
  origin: env.corsOrigin,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/features', featuresRouter);
app.use('/api/child-stories', childStoriesRouter);
app.use('/api/field-mappings', fieldMappingsRouter);
app.use('/api/iterations', iterationsRouter);
app.use('/api/bugs', bugsRouter);
app.use('/api/test-cases', testCasesRouter);
app.use('/api/qa-assignments', qaAssignmentsRouter);
app.use('/api/comments', commentsRouter);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Start server
app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
  console.log(`Environment: ${env.nodeEnv}`);
  console.log(`ADO Organization: ${env.adoOrgUrl}`);
  console.log(`ADO Project: ${env.adoProject}`);
});

export default app;