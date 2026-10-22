import { adoClient } from './adoClient.js';
import { getFieldMappings } from './fieldMapping.js';
import { mapWorkItemToBug } from '../types/api.js';
import { DEFAULT_FIELDS } from '../utils/adoUrls.js';
import { env } from '../config/env.js';
import type { Bug, FetchError } from '../types/api.js';
import type { AdoWorkItem, AdoWiqlResponse, AdoWiqlWorkItemRelation } from '../types/ado.js';

export interface FetchBugsResult {
  bugs: Bug[];
  errors: FetchError[];
}

const WORK_ITEM_TYPE_BUG = 'Bug';
const WORK_ITEM_TYPE_USER_STORY = 'User Story';
const CLOSED_STATUSES = ['Closed', 'Removed', 'Done', 'Resolved'];

function buildBugsQuery(iterationPath: string): string {
  // Escape single quotes in iteration path
  const escapedPath = iterationPath.replace(/'/g, "''");

  return `
    SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo],
           [System.TeamProject], [System.BoardColumn], [System.CreatedDate], [System.ChangedDate],
           [Microsoft.VSTS.Common.Severity], [Microsoft.VSTS.Common.Priority]
    FROM WorkItemLinks
    WHERE [Source].[System.IterationPath] UNDER '${escapedPath}'
      AND [Source].[System.WorkItemType] = '${WORK_ITEM_TYPE_USER_STORY}'
      AND [System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'
      AND [Target].[System.WorkItemType] = '${WORK_ITEM_TYPE_BUG}'
      AND [Target].[System.State] NOT IN ('Closed', 'Removed')
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
    'Microsoft.VSTS.Common.Severity',
    'Microsoft.VSTS.Common.Priority',
    'System.CreatedDate',
    'System.ChangedDate',
  ];

  const items = await adoClient.getWorkItems(ids, fields);
  const itemMap = new Map<number, AdoWorkItem>();
  for (const item of items) {
    itemMap.set(item.id, item);
  }
  return itemMap;
}

export async function fetchBugs(iterationPath: string): Promise<FetchBugsResult> {
  const bugs: Bug[] = [];
  const errors: FetchError[] = [];

  if (!iterationPath) {
    return { bugs, errors };
  }

  // Build a map of User Story ID to User Story title for parent association
  let userStoryTitleMap: Map<number, string> = new Map();
  try {
    // First, get all User Stories in the iteration to build the parent map
    const usQuery = `
      SELECT [System.Id], [System.Title]
      FROM WorkItems
      WHERE [System.IterationPath] UNDER '${iterationPath.replace(/'/g, "''")}'
        AND [System.WorkItemType] = '${WORK_ITEM_TYPE_USER_STORY}'
    `;
    const usWiqlResult = await adoClient.runWiql(usQuery);
    const usIds = [...new Set(usWiqlResult.workItems.map(w => w.id))];

    if (usIds.length > 0) {
      const usItemsMap = await fetchWorkItemsByIds(usIds);
      for (const [id, item] of usItemsMap) {
        const title = item.fields['System.Title'] as string;
        userStoryTitleMap.set(id, title);
      }
    }
  } catch {
    // If we can't fetch US titles, we'll continue without them
  }

  try {
    // Run WIQL to get Bug relationships
    const query = buildBugsQuery(iterationPath);
    const wiqlResult = await adoClient.runWiql(query);

    // Extract unique bug work item IDs
    const bugIds = [...new Set(wiqlResult.workItemRelations.map(r => r.target.id))];

    if (bugIds.length === 0) {
      return { bugs: [], errors: [] };
    }

    // Fetch full work item details for bugs
    const bugItemsMap = await fetchWorkItemsByIds(bugIds);

    // Build parent-child associations from WIQL relations
    // A bug can have multiple parent User Stories
    const parentChildMap = new Map<number, number[]>();
    for (const relation of wiqlResult.workItemRelations) {
      const parentId = relation.source.id;
      const childId = relation.target.id;
      if (!parentChildMap.has(childId)) {
        parentChildMap.set(childId, []);
      }
      parentChildMap.get(childId)!.push(parentId);
    }

    // Create Bug entries for each parent-child pair
    for (const [bugId, parentIds] of parentChildMap) {
      const bugItem = bugItemsMap.get(bugId);
      if (!bugItem) {
        errors.push(classifyError(undefined, bugId));
        continue;
      }

      const workItemType = bugItem.fields['System.WorkItemType'] as string;
      if (workItemType !== WORK_ITEM_TYPE_BUG) {
        errors.push({
          id: bugId,
          message: `Work item is a "${workItemType}", not a Bug`,
          type: 'invalid_type',
        });
        continue;
      }

      // Filter out closed/removed bugs
      const bugStatus = bugItem.fields['System.State'] as string;
      if (CLOSED_STATUSES.some(s => s.toLowerCase() === bugStatus.toLowerCase())) {
        continue;
      }

      // Create an entry for each parent User Story
      for (const parentId of parentIds) {
        const parentTitle = userStoryTitleMap.get(parentId) ?? `User Story ${parentId}`;
        const bug = mapWorkItemToBug(
          bugItem,
          process.env.ADO_ORG_URL ?? '',
          { id: parentId, title: parentTitle },
          getFieldMappings()
        );
        bugs.push(bug);
      }
    }
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    errors.push({ id: 0, message: `Failed to query bugs: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'api_error' });
  }

  return { bugs, errors };
}