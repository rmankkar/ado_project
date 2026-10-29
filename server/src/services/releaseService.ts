import { adoClient } from './adoClient.js';
import { getFieldMappings } from './fieldMapping.js';
import { mapWorkItemToFeature } from '../types/api.js';
import { DEFAULT_FIELDS } from '../utils/adoUrls.js';
import type { Feature, ChildUserStory, FetchError } from '../types/api.js';
import type { AdoWorkItem } from '../types/ado.js';

export interface ReleaseWithFeatures {
  releaseId: number;
  releaseTitle: string;
  stageGateId: number;
  stageGateTitle: string;
  features: Feature[];
  childStories: ChildUserStory[];
}

export interface ReleaseItem {
  id: number;
  title: string;
  state: string;
}

export interface FetchReleaseFeaturesResult {
  releases: ReleaseWithFeatures[];
  errors: FetchError[];
}

export interface FetchReleasesResult {
  releases: ReleaseItem[];
  errors: FetchError[];
}

const STAGE_GATE_TITLE_FILTER = '[B2B STAGE GATE]: Build CC';
const RELEASE_TAG = 'blackhawks';
const EXCLUDED_RELEASE_STATES = ['Closed', 'Completed', 'Rejected'];

async function fetchWorkItemsByIds(ids: number[]): Promise<Map<number, AdoWorkItem>> {
  const fields = [
    ...DEFAULT_FIELDS,
    getFieldMappings().boardColumn,
    getFieldMappings().deployDate,
    getFieldMappings().targetDate,
    'System.Tags',
    'System.Parent',
    'System.IterationPath',
    'Microsoft.VSTS.Scheduling.StoryPoints',
  ];

  const items = await adoClient.getWorkItems(ids, fields);
  const itemMap = new Map<number, AdoWorkItem>();
  for (const item of items) {
    itemMap.set(item.id, item);
  }
  return itemMap;
}

function buildReleasesQuery(): string {
  return `
    SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.Tags]
    FROM WorkItems
    WHERE [System.WorkItemType] = 'Release'
      AND [System.Tags] CONTAINS '${RELEASE_TAG}'
      AND [System.State] NOT IN ('Closed', 'Completed', 'Rejected')
    ORDER BY [System.Id]
  `;
}

function buildStageGatesQuery(releaseIds: number[]): string {
  const idsList = releaseIds.map(id => id.toString()).join(',');
  return `
    SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.Parent]
    FROM WorkItems
    WHERE [System.WorkItemType] = 'Stage Gate'
      AND [System.Parent] IN (${idsList})
      AND [System.Title] CONTAINS '${STAGE_GATE_TITLE_FILTER}'
    ORDER BY [System.Id]
  `;
}

function buildFeaturesQuery(stageGateIds: number[]): string {
  const idsList = stageGateIds.map(id => id.toString()).join(',');
  return `
    SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo],
           [System.TeamProject], [System.CreatedDate], [System.ChangedDate], [System.Parent], [System.IterationPath]
    FROM WorkItems
    WHERE [System.WorkItemType] = 'Feature'
      AND [System.Parent] IN (${idsList})
      AND [System.State] <> 'Removed'
    ORDER BY [System.Id]
  `;
}

function buildUserStoriesQuery(featureIds: number[]): string {
  const idsList = featureIds.map(id => id.toString()).join(',');
  return `
    SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo],
           [System.TeamProject], [System.CreatedDate], [System.ChangedDate], [System.Parent],
           [System.BoardColumn], [Custom.DeployDate], [Microsoft.VSTS.Scheduling.TargetDate], [System.IterationPath], [Microsoft.VSTS.Scheduling.StoryPoints]
    FROM WorkItems
    WHERE [System.WorkItemType] = 'User Story'
      AND [System.Parent] IN (${idsList})
      AND [System.State] <> 'Removed'
    ORDER BY [System.Id]
  `;
}

function classifyError(status: number | undefined, id: number): FetchError {
  if (status === 404) {
    return { id, message: 'Work item not found', type: 'not_found' };
  }
  if (status === 403 || status === 401) {
    return { id, message: 'Access denied (check PAT permissions)', type: 'access_denied' };
  }
  return { id, message: 'API request failed', type: 'api_error' };
}

export async function fetchReleases(): Promise<FetchReleasesResult> {
  const result: FetchReleasesResult = {
    releases: [],
    errors: [],
  };

  try {
    console.log('[DEBUG] Fetching Releases with tag "blackhawks"...');
    const releasesWiql = await adoClient.runWiql(buildReleasesQuery());
    const releaseIds = releasesWiql.workItems.map(w => w.id);
    console.log('[DEBUG] Found Release IDs:', releaseIds);

    if (releaseIds.length === 0) {
      return result;
    }

    // Fetch full Release work items
    const releaseItemsMap = await fetchWorkItemsByIds(releaseIds);

    for (const releaseId of releaseIds) {
      const releaseItem = releaseItemsMap.get(releaseId);
      if (!releaseItem) continue;

      const title = releaseItem.fields['System.Title'] as string;
      const state = releaseItem.fields['System.State'] as string;

      result.releases.push({ id: releaseId, title, state });
    }

  } catch (error) {
    console.error('[ERROR] Failed to fetch releases:', error);
    const status = (error as Error & { status?: number }).status;
    result.errors.push({ id: 0, message: `Failed to query releases: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'api_error' });
  }

  return result;
}

export async function fetchFeaturesFromRelease(releaseIds?: number[]): Promise<FetchReleaseFeaturesResult> {
  const result: FetchReleaseFeaturesResult = {
    releases: [],
    errors: [],
  };

  try {
    // Step 1: Fetch Releases with "blackhawks" tag
    console.log('[DEBUG] Fetching Releases with tag "blackhawks"...');
    const releasesWiql = await adoClient.runWiql(buildReleasesQuery());
    let releaseIdsToUse = releasesWiql.workItems.map(w => w.id);

    // Filter by provided release IDs if any
    if (releaseIds && releaseIds.length > 0) {
      releaseIdsToUse = releaseIdsToUse.filter(id => releaseIds.includes(id));
    }

    console.log('[DEBUG] Found Release IDs:', releaseIdsToUse);

    if (releaseIdsToUse.length === 0) {
      return result;
    }

    // Fetch full Release work items
    const releaseItemsMap = await fetchWorkItemsByIds(releaseIdsToUse);

    // Step 2: Fetch Stage Gates under those Releases with title containing "[B2B STAGE GATE]: Build CC"
    console.log('[DEBUG] Fetching Stage Gates...');
    const stageGatesWiql = await adoClient.runWiql(buildStageGatesQuery(releaseIdsToUse));
    const stageGateIds = stageGatesWiql.workItems.map(w => w.id);
    console.log('[DEBUG] Found Stage Gate IDs:', stageGateIds);

    if (stageGateIds.length === 0) {
      return result;
    }

    // Fetch full Stage Gate work items
    const stageGateItemsMap = await fetchWorkItemsByIds(stageGateIds);

    // Step 3: Fetch Features under those Stage Gates
    console.log('[DEBUG] Fetching Features...');
    const featuresWiql = await adoClient.runWiql(buildFeaturesQuery(stageGateIds));
    const featureIds = featuresWiql.workItems.map(w => w.id);
    console.log('[DEBUG] Found Feature IDs:', featureIds);

    let featureItemsMap = new Map<number, AdoWorkItem>();
    if (featureIds.length > 0) {
      featureItemsMap = await fetchWorkItemsByIds(featureIds);
    }

    // Step 4: Fetch User Stories under those Features
    let childStoriesMap = new Map<number, ChildUserStory[]>();
    if (featureIds.length > 0) {
      console.log('[DEBUG] Fetching User Stories...');
      const userStoriesWiql = await adoClient.runWiql(buildUserStoriesQuery(featureIds));
      const userStoryIds = userStoriesWiql.workItems.map(w => w.id);
      console.log('[DEBUG] Found User Story IDs:', userStoryIds);

      if (userStoryIds.length > 0) {
        const userStoryItemsMap = await fetchWorkItemsByIds(userStoryIds);

        // Map User Stories to their parent Features
        for (const [id, item] of userStoryItemsMap) {
          const parent = item.fields['System.Parent'] as number | undefined;
          if (parent && featureIds.includes(parent)) {
            const story = mapWorkItemToChildStory(item, process.env.ADO_ORG_URL ?? '', { id: parent, title: '' }, getFieldMappings());
            const existing = childStoriesMap.get(parent) ?? [];
            existing.push(story);
            childStoriesMap.set(parent, existing);
          }
        }
      }
    }

    // Build the result structure grouped by Release
    for (const releaseId of releaseIdsToUse) {
      const releaseItem = releaseItemsMap.get(releaseId);
      if (!releaseItem) continue;

      const releaseTitle = releaseItem.fields['System.Title'] as string;

      // Find Stage Gates for this Release (full work items)
      const releaseStageGates = Array.from(stageGateItemsMap.values()).filter(sg => {
        const parent = sg.fields['System.Parent'] as number | undefined;
        return parent === releaseId;
      });

      for (const stageGate of releaseStageGates) {
        const stageGateId = stageGate.id;
        const stageGateTitle = stageGate.fields['System.Title'] as string;

        // Find Features for this Stage Gate
        const stageGateFeatures: Feature[] = [];
        const stageGateChildStories: ChildUserStory[] = [];

        for (const featureId of featureIds) {
          const featureItem = featureItemsMap.get(featureId);
          if (!featureItem) continue;

          const parent = featureItem.fields['System.Parent'] as number | undefined;
          if (parent === stageGateId) {
            const feature = mapWorkItemToFeature(featureItem, process.env.ADO_ORG_URL ?? '');
            stageGateFeatures.push(feature);

            // Add child stories for this feature
            const stories = childStoriesMap.get(featureId) ?? [];
            stageGateChildStories.push(...stories);
          }
        }

        if (stageGateFeatures.length > 0 || stageGateChildStories.length > 0) {
          result.releases.push({
            releaseId,
            releaseTitle,
            stageGateId,
            stageGateTitle,
            features: stageGateFeatures,
            childStories: stageGateChildStories,
          });
        }
      }
    }

  } catch (error) {
    console.error('[ERROR] Failed to fetch features from release:', error);
    const status = (error as Error & { status?: number }).status;
    result.errors.push({ id: 0, message: `Failed to query release features: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'api_error' });
  }

  return result;
}

// Helper to map work item to ChildUserStory (copied from api.ts but standalone)
function mapWorkItemToChildStory(
  item: AdoWorkItem,
  orgUrl: string,
  parentFeature: { id: number; title: string },
  fieldMappings: { boardColumn: string; deployDate: string; targetDate: string }
): ChildUserStory {
  const fields = item.fields as Record<string, unknown>;
  const assignedTo = fields['System.AssignedTo'] as { displayName?: string } | undefined;
  const project = fields['System.TeamProject'] as string;
  const iterationPath = fields['System.IterationPath'] as string | undefined;
  const storyPoints = fields['Microsoft.VSTS.Scheduling.StoryPoints'] as number | undefined;

  const boardColumnValue = fields[fieldMappings.boardColumn] as string | undefined;
  const deployDateValue = fields[fieldMappings.deployDate] as string | undefined;
  const targetDateValue = fields[fieldMappings.targetDate] as string | undefined;

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
    iterationPath: iterationPath ?? null,
    storyPoints: storyPoints ?? null,
    url: `${orgUrl}/${project}/_workitems/edit/${item.id}`,
  };
}