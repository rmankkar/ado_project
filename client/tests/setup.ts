import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
  }),
  useMutation: vi.fn(),
  QueryClient: vi.fn().mockImplementation(() => ({
    setQueryData: vi.fn(),
    getQueryData: vi.fn(),
  })),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock fetch
global.fetch = vi.fn();