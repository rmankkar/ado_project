export interface Feature {
  id: number;
  title: string;
  status: string;
  assignedTo: string | null;
  project: string;
  url: string;
}

export interface ChildUserStory {
  id: number;
  title: string;
  status: string;
  assignedTo: string | null;
  boardColumn: string | null;
  deployDate: string | null;
  targetDate: string | null;
  parentFeature: {
    id: number;
    title: string;
  };
  url: string;
}

export interface FetchError {
  id: number;
  message: string;
  type: 'not_found' | 'access_denied' | 'invalid_type' | 'api_error' | 'unknown';
}

export interface FetchFeaturesResponse {
  features: Feature[];
  errors: FetchError[];
}

export interface FetchChildStoriesResponse {
  childStories: ChildUserStory[];
  errors: FetchError[];
}

export interface FieldMappingsResponse {
  boardColumn: string;
  deployDate: string;
  targetDate: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  adoConfigured: boolean;
}

export type SortField = 'id' | 'title' | 'status' | 'assignedTo' | 'boardColumn' | 'deployDate' | 'targetDate' | 'parentFeature';
export type SortDirection = 'asc' | 'desc';

export interface SortState {
  field: SortField;
  direction: SortDirection;
}