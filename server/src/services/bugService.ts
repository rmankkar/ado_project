import { adoClient } from './adoClient.js';
import { getFieldMappings } from './fieldMapping.js';
import { mapWorkItemToBug } from '../types/api.js';
import { DEFAULT_FIELDS } from '../utils/adoUrls.js';
import { env } from '../config/env.js';
import type { Bug, FetchError } from '../types/api.js';
import type { AdoWorkItem } from '../types/ado.js';

export interface FetchBugsResult {
  bugs: Bug[];
  errors: FetchError[];
}

const WORK_ITEM_TYPE_BUG = 'Bug';
const CLOSED_STATUSES = ['Closed', 'Removed', 'Done', 'Resolved'];

// Removed classifyError function - no longer needed with simplified logic

function buildDirectBugsQuery(iterationPath: string): string {
  // Escape single quotes in iteration path
  const escapedIteraionPath = iterationPath.replace(/'/g, "''");
  const escapedAreaPath = 'Global_Data_Project\\B2B\\B2B Blackhawks'.replace(/'/g, "''");
  return `
    SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo],
           [System.TeamProject], [System.BoardColumn], [System.CreatedDate], [System.ChangedDate],
           [Microsoft.VSTS.Common.Severity], [Microsoft.VSTS.Common.Priority],
           [System.Parent], [Custom.GoLive]
    FROM WorkItems
    WHERE [System.IterationPath] UNDER '${escapedIteraionPath}'
      AND [System.areaPath] UNDER '${escapedAreaPath}'
      AND [System.WorkItemType] = '${WORK_ITEM_TYPE_BUG}'
      AND [System.State] NOT IN ('Closed', 'Removed')
      AND [Custom.DetectedOnEnvironment1] <> 'Sandbox'
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

async function fetchWorkItemsByIds(ids: number[]): Promise<Map<number, AdoWorkItem>> {
  if (ids.length === 0) return new Map();

  const fields = [
    ...DEFAULT_FIELDS,
    getFieldMappings().boardColumn,
    getFieldMappings().goLive,
    'Microsoft.VSTS.Common.Severity',
    'Microsoft.VSTS.Common.Priority',
    'System.CreatedDate',
    'System.ChangedDate',
    'System.Parent',
  ];

  const items = await adoClient.getWorkItems(ids, fields);
  const itemMap = new Map<number, AdoWorkItem>();
  for (const item of items) {
    itemMap.set(item.id, item);
  }
  return itemMap;
}

/**
 * Fetch parent User Story titles for a list of parent IDs
 */
async function fetchParentUserStories(parentIds: number[]): Promise<Map<number, string>> {
  const parentMap = new Map<number, string>();

  if (parentIds.length === 0) return parentMap;

  try {
    const uniqueParentIds = [...new Set(parentIds)];
    console.log('[DEBUG] Fetching parent items for IDs:', uniqueParentIds);
    const parentItemsMap = await fetchWorkItemsByIds(uniqueParentIds);
    console.log('[DEBUG] Parent items fetched:', parentItemsMap.size);

    for (const [id, item] of parentItemsMap) {
      const title = item.fields['System.Title'] as string;
      const workItemType = item.fields['System.WorkItemType'] as string;
      console.log('[DEBUG] Parent item', id, '- Type:', workItemType, 'Title:', title);
      // Only include User Stories as parents
      if (workItemType === 'User Story') {
        parentMap.set(id, title);
      } else {
        console.log('[DEBUG] Skipping parent', id, '- not a User Story (type:', workItemType, ')');
      }
    }
  } catch (error) {
    console.error('[DEBUG] Error fetching parent User Stories:', error);
    // If we can't fetch parent titles, we'll continue without them
  }

  console.log('[DEBUG] Final parent title map:', Object.fromEntries(parentMap));
  return parentMap;
}

export async function fetchBugs(iterationPath: string): Promise<FetchBugsResult> {
  const bugs: Bug[] = [];
  const errors: FetchError[] = [];

  if (!iterationPath) {
    return { bugs, errors };
  }

  try {
    // Run WIQL to directly get Bugs in the iteration (not via User Story links)
    const query = buildDirectBugsQuery(iterationPath);
    console.log('[DEBUG] WIQL Query:', query);
    const wiqlResult = await adoClient.runWiql(query);
    console.log('[DEBUG] WIQL Result workItems count:', wiqlResult.workItems.length);

    // Extract unique bug work item IDs
    const bugIds = [...new Set(wiqlResult.workItems.map(w => w.id))];
    console.log('[DEBUG] Bug IDs from WIQL:', bugIds);

    if (bugIds.length === 0) {
      return { bugs: [], errors: [] };
    }

    // Fetch full work item details for bugs
    const bugItemsMap = await fetchWorkItemsByIds(bugIds);
    console.log('[DEBUG] Bug items fetched:', bugItemsMap.size);

    // Collect parent IDs from the bugs (System.Parent field)
    const parentIds: number[] = [];
    for (const bugItem of bugItemsMap.values()) {
      const parent = bugItem.fields['System.Parent'] as number | undefined;
      console.log('[DEBUG] Bug', bugItem.id, 'System.Parent:', parent);
      if (parent) {
        console.log('[DEBUG] Adding parent ID:', parent);
        parentIds.push(parent);
      }
    }
    console.log('[DEBUG] Collected parent IDs:', parentIds);

    // Fetch parent User Story titles in batch
    const parentTitleMap = await fetchParentUserStories(parentIds);
    console.log('[DEBUG] Parent title map:', Object.fromEntries(parentTitleMap));

    // Create Bug entries
    for (const bugItem of bugItemsMap.values()) {
      const workItemType = bugItem.fields['System.WorkItemType'] as string;
      if (workItemType !== WORK_ITEM_TYPE_BUG) {
        continue; // Should not happen with our query, but safe check
      }

      const bugStatus = bugItem.fields['System.State'] as string;
      // Double-check filter (in case WIQL didn't filter properly)
      if (CLOSED_STATUSES.some(s => s.toLowerCase() === bugStatus.toLowerCase())) {
        continue;
      }

      // Get parent User Story if available
      const parent = bugItem.fields['System.Parent'] as number | undefined;
      const parentInfo = parent
        ? { id: parent, title: parentTitleMap.get(parent) ?? `User Story ${parent}` }
        : null;

      const bug = mapWorkItemToBug(
        bugItem,
        process.env.ADO_ORG_URL ?? '',
        parentInfo,
        getFieldMappings()
      );
      bugs.push(bug);
    }
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    errors.push({ id: 0, message: `Failed to query bugs: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'api_error' });
  }

  return { bugs, errors };
}