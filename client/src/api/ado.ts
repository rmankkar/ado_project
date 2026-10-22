import type {
  FetchFeaturesResponse,
  FetchChildStoriesResponse,
  FieldMappingsResponse,
  HealthResponse,
  Iteration,
  Bug,
  FetchError,
} from '../types/ado.js';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message ?? `HTTP error ${response.status}`);
  }

  return response.json();
}

export const adoApi = {
  async checkHealth(): Promise<HealthResponse> {
    return fetchJson<HealthResponse>(`${API_BASE}/health`);
  },

  async fetchFeatures(ids: number[]): Promise<FetchFeaturesResponse> {
    return fetchJson<FetchFeaturesResponse>(`${API_BASE}/features`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },

  async fetchChildStories(featureIds: number[]): Promise<FetchChildStoriesResponse> {
    return fetchJson<FetchChildStoriesResponse>(`${API_BASE}/child-stories`, {
      method: 'POST',
      body: JSON.stringify({ featureIds }),
    });
  },

  async getFieldMappings(): Promise<FieldMappingsResponse> {
    return fetchJson<FieldMappingsResponse>(`${API_BASE}/field-mappings`);
  },

  async fetchIterations(): Promise<{ iterations: Iteration[]; errors: FetchError[] }> {
    return fetchJson<{ iterations: Iteration[]; errors: FetchError[] }>(`${API_BASE}/iterations`);
  },

  async fetchBugs(iterationPath: string): Promise<{ bugs: Bug[]; errors: FetchError[] }> {
    return fetchJson<{ bugs: Bug[]; errors: FetchError[] }>(`${API_BASE}/bugs`, {
      method: 'POST',
      body: JSON.stringify({ iterationPath }),
    });
  },
};

export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
}