import { vi } from 'vitest';

// Mock environment variables
vi.stubEnv('ADO_ORG_URL', 'https://dev.azure.com/test-org');
vi.stubEnv('ADO_PROJECT', 'TestProject');
vi.stubEnv('ADO_PAT', 'test-pat-token');
vi.stubEnv('ADO_FIELD_BOARD_COLUMN', 'System.BoardColumn');
vi.stubEnv('ADO_FIELD_DEPLOY_DATE', 'Custom.DeployDate');
vi.stubEnv('ADO_FIELD_TARGET_DATE', 'Microsoft.VSTS.Scheduling.TargetDate');
vi.stubEnv('PORT', '3001');
vi.stubEnv('NODE_ENV', 'test');
vi.stubEnv('CORS_ORIGIN', 'http://localhost:5173');

// Mock fetch globally
global.fetch = vi.fn();