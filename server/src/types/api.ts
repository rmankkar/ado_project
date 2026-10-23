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
    url: string;
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

export interface Iteration {
  id: string;
  name: string;
  path: string;
  startDate: string | null;
  finishDate: string | null;
  structureType: string;
  hasChildren: boolean;
  url: string;
}

export interface Bug {
  id: number;
  title: string;
  status: string;
  assignedTo: string | null;
  severity: string | null;
  priority: number | null;
  boardColumn: string | null;
  createdDate: string | null;
  changedDate: string | null;
  parentUserStory: {
    id: number;
    title: string;
    url: string;
  } | null;
  url: string;
}

export interface FetchIterationsResponse {
  iterations: Iteration[];
  errors: FetchError[];
}

export interface FetchBugsRequest {
  iterationPath: string;
}

export interface FetchBugsResponse {
  bugs: Bug[];
  errors: FetchError[];
}

export interface TestCase {
  id: number;
  title: string;
  status: string;
  assignedTo: string | null;
  complexity: string | null;
  tags: string | null;
  createdBy: string | null;
  parentUserStories: {
    id: number;
    title: string;
    url: string;
  }[];
  url: string;
}

export interface FetchTestCasesRequest {
  iterationPath: string;
}

export interface FetchTestCasesResponse {
  testCases: TestCase[];
  errors: FetchError[];
}

export interface FetchQaUserStoriesRequest {
  iterationPath: string;
}

export interface FetchQaUserStoriesResponse {
  userStories: ChildUserStory[];
  errors: FetchError[];
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

  // Construct parent Feature URL
  const parentFeatureWithUrl = {
    ...parentFeature,
    url: `${orgUrl}/${project}/_workitems/edit/${parentFeature.id}`,
  };

  return {
    id: item.id,
    title: fields['System.Title'] as string,
    status: fields['System.State'] as string,
    assignedTo: assignedTo?.displayName ?? null,
    boardColumn: boardColumnValue ?? null,
    deployDate: deployDateValue ?? null,
    targetDate: targetDateValue ?? null,
    parentFeature: parentFeatureWithUrl,
    url: `${orgUrl}/${project}/_workitems/edit/${item.id}`,
  };
}

export function mapWorkItemToIteration(item: AdoWorkItem, orgUrl: string): Iteration {
  const fields = item.fields as AdoWorkItemFields;
  const project = fields['System.TeamProject'] as string;
  const iterationPath = fields['System.IterationPath'] as string;

  return {
    id: iterationPath,
    name: item.id.toString(),
    path: iterationPath,
    startDate: fields['Microsoft.VSTS.Scheduling.StartDate'] as string | null,
    finishDate: fields['Microsoft.VSTS.Scheduling.FinishDate'] as string | null,
    structureType: 'iteration',
    hasChildren: false,
    url: `${orgUrl}/${project}/_sprints/taskboard/${item.id}`,
  };
}

export function mapWorkItemToBug(
  item: AdoWorkItem,
  orgUrl: string,
  parentUserStory: { id: number; title: string } | null,
  fieldMappings: { boardColumn: string; deployDate: string; targetDate: string }
): Bug {
  const fields = item.fields as AdoWorkItemFields;
  const assignedTo = fields['System.AssignedTo'] as AdoIdentityRef | undefined;
  const project = fields['System.TeamProject'] as string;

  const boardColumnValue = fields[fieldMappings.boardColumn] as string | undefined;
  const severityValue = fields['Microsoft.VSTS.Common.Severity'] as string | undefined;
  const priorityValue = fields['Microsoft.VSTS.Common.Priority'] as number | undefined;
  const createdDateValue = fields['System.CreatedDate'] as string | undefined;
  const changedDateValue = fields['System.ChangedDate'] as string | undefined;

  // Construct parent User Story URL if parent exists
  const parentUserStoryWithUrl = parentUserStory
    ? {
        ...parentUserStory,
        url: `${orgUrl}/${project}/_workitems/edit/${parentUserStory.id}`,
      }
    : null;

  return {
    id: item.id,
    title: fields['System.Title'] as string,
    status: fields['System.State'] as string,
    assignedTo: assignedTo?.displayName ?? null,
    severity: severityValue ?? null,
    priority: priorityValue ?? null,
    boardColumn: boardColumnValue ?? null,
    createdDate: createdDateValue ?? null,
    changedDate: changedDateValue ?? null,
    parentUserStory: parentUserStoryWithUrl,
    url: `${orgUrl}/${project}/_workitems/edit/${item.id}`,
  };
}

// Map raw complexity values to readable labels
function mapComplexityValue(rawValue: string | undefined): string | null {
  if (!rawValue) return null;
  const complexityMap: Record<string, string> = {
    '1-Simple': 'Simple',
    '2-Medium': 'Medium',
    '3-Complex': 'Complex',
    'Not Defined': 'Not Defined',
  };
  return complexityMap[rawValue] ?? rawValue;
}

export function mapWorkItemToTestCase(
  item: AdoWorkItem,
  orgUrl: string,
  parentUserStories: { id: number; title: string }[],
): TestCase {
  const fields = item.fields as AdoWorkItemFields;
  const assignedTo = fields['System.AssignedTo'] as AdoIdentityRef | undefined;
  const createdBy = fields['System.CreatedBy'] as AdoIdentityRef | undefined;
  const project = fields['System.TeamProject'] as string;

  const complexityRawValue = fields['Custom.Complexity'] as string | undefined;
  const tagsValue = fields['System.Tags'] as string | undefined;

  // Construct parent User Story URLs
  const parentUserStoriesWithUrl = parentUserStories.map(parent => ({
    ...parent,
    url: `${orgUrl}/${project}/_workitems/edit/${parent.id}`,
  }));

  return {
    id: item.id,
    title: fields['System.Title'] as string,
    status: fields['System.State'] as string,
    assignedTo: assignedTo?.displayName ?? null,
    complexity: mapComplexityValue(complexityRawValue),
    tags: tagsValue ?? null,
    createdBy: createdBy?.displayName ?? null,
    parentUserStories: parentUserStoriesWithUrl,
    url: `${orgUrl}/${project}/_workitems/edit/${item.id}`,
  };
}