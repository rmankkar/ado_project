import { adoClient } from './adoClient.js';
import { getFieldMappings } from './fieldMapping.js';
import { mapWorkItemToChildStory } from '../types/api.js';
import { DEFAULT_FIELDS } from '../utils/adoUrls.js';
import { env } from '../config/env.js';
import type { ChildUserStory, FetchError } from '../types/api.js';
import type { AdoWorkItem, AdoWiqlResponse, AdoWiqlWorkItemRelation } from '../types/ado.js';

export interface FetchChildStoriesResult {
  childStories: ChildUserStory[];
  errors: FetchError[];
}

const WORK_ITEM_TYPE_USER_STORY = 'User Story';

function buildChildQuery(featureIds: number[]): string {
  const ids = featureIds.join(',');
  const linkType = env.adoLinkType;
  return `
    SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo],
           [System.TeamProject], [System.BoardColumn], [Custom.DeployDate], [Microsoft.VSTS.Scheduling.TargetDate]
    FROM WorkItemLinks
    WHERE [Source].[System.Id] IN (${ids})
      AND [System.Links.LinkType] = '${linkType}'
      AND [Target].[System.WorkItemType] = '${WORK_ITEM_TYPE_USER_STORY}'
    ORDER BY [System.Id]
    MODE (Recursive)
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

async function fetchWorkItemsByIds(ids: number[]): Promise<Map<number, AdoWorkItem>> {
  if (ids.length === 0) return new Map();

  const fields = [
    ...DEFAULT_FIELDS,
    getFieldMappings().boardColumn,
    getFieldMappings().deployDate,
    getFieldMappings().targetDate,
  ];

  const items = await adoClient.getWorkItems(ids, fields);
  const itemMap = new Map<number, AdoWorkItem>();
  for (const item of items) {
    itemMap.set(item.id, item);
  }
  return itemMap;
}

export async function fetchChildStories(featureIds: number[]): Promise<FetchChildStoriesResult> {
  const childStories: ChildUserStory[] = [];
  const errors: FetchError[] = [];

  if (featureIds.length === 0) {
    return { childStories, errors };
  }

  // Build a map of feature ID to feature title for parent association
  let featureTitleMap: Map<number, string> = new Map();
  try {
    const featureItems = await fetchWorkItemsByIds(featureIds);
    for (const [id, item] of featureTitleMap) {
      // This won't work - need to fix
    }
    for (const [id, item] of featureItems) {
      featureTitleMap.set(id, item.fields['System.Title'] as string);
    }
  } catch {
    // If we can't fetch feature titles, we'll use IDs only
  }

  try {
    // Run WIQL to get child relationships
    const query = buildChildQuery(featureIds);
    const wiqlResult = await adoClient.runWiql(query);

    // Extract unique child work item IDs (guard against null source/target)
    const childIds = [...new Set(
      wiqlResult.workItemRelations
        .filter(r => r.target?.id != null)
        .map(r => r.target!.id)
    )];

    if (childIds.length === 0) {
      return { childStories: [], errors: [] };
    }

    // Fetch full work item details for children
    const childItemsMap = await fetchWorkItemsByIds(childIds);

    // Build parent-child associations from WIQL relations
    // A child can have multiple parents, so we create entries for each parent
    const parentChildMap = new Map<number, number[]>();
    for (const relation of wiqlResult.workItemRelations) {
      // Skip relations with missing source or target
      if (!relation.source?.id || !relation.target?.id) {
        continue;
      }
      const parentId = relation.source.id;
      const childId = relation.target.id;
      if (!parentChildMap.has(childId)) {
        parentChildMap.set(childId, []);
      }
      parentChildMap.get(childId)!.push(parentId);
    }

    // Create ChildUserStory entries for each parent-child pair
    for (const [childId, parentIds] of parentChildMap) {
      const childItem = childItemsMap.get(childId);
      if (!childItem) {
        errors.push(classifyError(undefined, childId));
        continue;
      }

      const workItemType = childItem.fields['System.WorkItemType'] as string;
      if (workItemType !== WORK_ITEM_TYPE_USER_STORY) {
        errors.push({
          id: childId,
          message: `Work item is a "${workItemType}", not a User Story`,
          type: 'invalid_type',
        });
        continue;
      }

      // Create an entry for each parent
      for (const parentId of parentIds) {
        const parentTitle = featureTitleMap.get(parentId) ?? `Feature ${parentId}`;
        const childStory = mapWorkItemToChildStory(
          childItem,
          process.env.ADO_ORG_URL ?? '',
          { id: parentId, title: parentTitle },
          getFieldMappings()
        );
        childStories.push(childStory);
      }
    }
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    // If WIQL fails, we can't determine specific IDs, so add generic error
    errors.push({ id: 0, message: `Failed to query child stories: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'api_error' });
  }

  return { childStories, errors };
}