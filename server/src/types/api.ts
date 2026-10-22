import type { AdoWorkItem, AdoWorkItemFields, AdoIdentityRef } from './ado.js';

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

export interface FetchFeaturesRequest {
  ids: number[];
}

export interface FetchFeaturesResponse {
  features: Feature[];
  errors: FetchError[];
}

export interface FetchChildStoriesRequest {
  featureIds: number[];
}

export interface FetchChildStoriesResponse {
  childStories: ChildUserStory[];
  errors: FetchError[];
}

export interface FetchError {
  id: number;
  message: string;
  type: 'not_found' | 'access_denied' | 'invalid_type' | 'api_error' | 'unknown';
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

export function mapWorkItemToFeature(item: AdoWorkItem, orgUrl: string): Feature {
  const fields = item.fields as AdoWorkItemFields;
  const assignedTo = fields['System.AssignedTo'] as AdoIdentityRef | undefined;
  const project = fields['System.TeamProject'] as string;

  return {
    id: item.id,
    title: fields['System.Title'] as string,
    status: fields['System.State'] as string,
    assignedTo: assignedTo?.displayName ?? null,
    project,
    url: `${orgUrl}/${project}/_workitems/edit/${item.id}`,
  };
}

export function mapWorkItemToChildStory(
  item: AdoWorkItem,
  orgUrl: string,
  parentFeature: { id: number; title: string },
  fieldMappings: { boardColumn: string; deployDate: string; targetDate: string }
): ChildUserStory {
  const fields = item.fields as AdoWorkItemFields;
  const assignedTo = fields['System.AssignedTo'] as AdoIdentityRef | undefined;
  const project = fields['System.TeamProject'] as string;

  const boardColumnValue = fields[fieldMappings.boardColumn] as string | undefined;
  const deployDateValue = fields[fieldMappings.deployDate] as string | undefined;
  const targetDateValue = fields[fieldMappings.targetDate] as string | undefined;

  return {
    id: item.id,
    title: fields['System.Title'] as string,
    status: fields['System.State'] as string,
    assignedTo: assignedTo?.displayName ?? null,
    boardColumn: boardColumnValue ?? null,
    deployDate: deployDateValue ?? null,
    targetDate: targetDateValue ?? null,
    parentFeature,
    url: `${orgUrl}/${project}/_workitems/edit/${item.id}`,
  };
}