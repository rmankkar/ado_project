import { adoClient } from './adoClient.js';
import { getFieldMappings } from './fieldMapping.js';
import { mapWorkItemToChildStory, mapWorkItemToBug } from '../types/api.js';
import { DEFAULT_FIELDS } from '../utils/adoUrls.js';
import { env } from '../config/env.js';
import type { FetchError, Bug, QaUserStoryWithBugs } from '../types/api.js';
import type { AdoWorkItem } from '../types/ado.js';

export interface FetchQaUserStoriesResult {
  userStories: QaUserStoryWithBugs[];
  errors: FetchError[];
}

const WORK_ITEM_TYPE_USER_STORY = 'User Story';
const QA_BOARD_COLUMN = 'In Progress(QA)';
const CLOSED_STATUSES = ['Closed', 'Removed', 'Done', 'Resolved'];

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
    'System.AssignedTo',
    'System.Parent',
    'Microsoft.VSTS.Scheduling.StoryPoints',
  ];

  const items = await adoClient.getWorkItems(ids, fields);
  const itemMap = new Map<number, AdoWorkItem>();
  for (const item of items) {
    itemMap.set(item.id, item);
  }
  return itemMap;
}

const WORK_ITEM_TYPE_BUG = 'Bug';
const HIERARCHY_LINK_TYPE = 'System.LinkTypes.Hierarchy-Forward';

function buildQaUserStoriesQuery(iterationPath: string): string {
  const escapedIterationPath = iterationPath.replace(/'/g, "''");
  const escapedAreaPath = 'Global_Data_Project\\B2B\\B2B Blackhawks'.replace(/'/g, "''");

  // Build the assigned to filter for QA team emails
  const qaEmails = env.qaTeamEmails.map(email => `'${email}'`).join(',');
  const assignedToFilter = qaEmails.length > 0
    ? `AND [System.AssignedTo] IN (${qaEmails})`
    : '';

  return `
    SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType],
           [System.AssignedTo], [System.TeamProject], [System.BoardColumn],
           [System.Parent]
    FROM WorkItems
    WHERE [System.IterationPath] UNDER '${escapedIterationPath}'
      AND [System.areaPath] UNDER '${escapedAreaPath}'
      AND [System.WorkItemType] = '${WORK_ITEM_TYPE_USER_STORY}'
      AND [System.State] NOT IN ('Closed', 'Removed')
      ${assignedToFilter}
      OR (
        [System.IterationPath] UNDER '${escapedIterationPath}'
        AND [System.areaPath] UNDER '${escapedAreaPath}'
        AND [System.WorkItemType] = '${WORK_ITEM_TYPE_USER_STORY}'
        AND [System.State] NOT IN ('Closed', 'Removed')
        AND [System.BoardColumn] = '${QA_BOARD_COLUMN}'
      )
    ORDER BY [System.Id]
  `;
}

function buildBugsQuery(userStoryIds: number[]): string {
  if (userStoryIds.length === 0) return '';
  const ids = userStoryIds.join(',');
  return `
    SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType],
           [System.AssignedTo], [System.TeamProject], [System.BoardColumn],
           [System.CreatedDate], [System.ChangedDate],
           [Microsoft.VSTS.Common.Severity], [Microsoft.VSTS.Common.Priority]
    FROM WorkItemLinks
    WHERE [Source].[System.Id] IN (${ids})
      AND [System.Links.LinkType] = '${HIERARCHY_LINK_TYPE}'
      AND [Target].[System.WorkItemType] = '${WORK_ITEM_TYPE_BUG}'
      AND [Target].[System.State] NOT IN ('Closed', 'Removed')
    ORDER BY [Target].[System.Id]
  `;
}

export async function fetchQaUserStories(iterationPath: string): Promise<FetchQaUserStoriesResult> {
  const userStories: QaUserStoryWithBugs[] = [];
  const errors: FetchError[] = [];

  if (!iterationPath) {
    return { userStories, errors };
  }

  try {
    const query = buildQaUserStoriesQuery(iterationPath);
    console.log('[DEBUG] QA User Stories WIQL Query:', query);
    const wiqlResult = await adoClient.runWiql(query);
    console.log('[DEBUG] QA User Stories WIQL Result workItems count:', wiqlResult.workItems.length);

    if (wiqlResult.workItems.length === 0) {
      return { userStories: [], errors: [] };
    }

    const userStoryIds = [...new Set(wiqlResult.workItems.map(w => w.id))];
    console.log('[DEBUG] QA User Story IDs from WIQL:', userStoryIds);

    const userStoryItemsMap = await fetchWorkItemsByIds(userStoryIds);
    console.log('[DEBUG] QA User Story items fetched:', userStoryItemsMap.size);

    // Collect parent Feature IDs
    const parentFeatureIds: number[] = [];
    for (const userStoryItem of userStoryItemsMap.values()) {
      const parent = userStoryItem.fields['System.Parent'] as number | undefined;
      if (parent) {
        parentFeatureIds.push(parent);
      }
    }
    console.log('[DEBUG] Collected parent Feature IDs:', parentFeatureIds);

    // Fetch parent Feature details
    const parentFeatureMap = new Map<number, { id: number; title: string }>();
    if (parentFeatureIds.length > 0) {
      const uniqueParentIds = [...new Set(parentFeatureIds)];
      const parentItemsMap = await fetchWorkItemsByIds(uniqueParentIds);
      for (const [id, item] of parentItemsMap) {
        const title = item.fields['System.Title'] as string;
        const workItemType = item.fields['System.WorkItemType'] as string;
        if (workItemType === 'Feature') {
          parentFeatureMap.set(id, { id, title });
        }
      }
    }
    console.log('[DEBUG] Parent Feature map:', Object.fromEntries(parentFeatureMap));

    // Fetch Bugs for User Stories using WIQL work item relations
    const bugsQuery = buildBugsQuery(userStoryIds);
    console.log('[DEBUG] Bugs WIQL Query:', bugsQuery);
    const bugsWiqlResult = await adoClient.runWiql(bugsQuery);
    console.log('[DEBUG] Bugs WIQL Result workItemRelations count:', bugsWiqlResult.workItemRelations.length);

    // Build a map of User Story ID -> Bug IDs from the relations
    const userStoryToBugIds = new Map<number, number[]>();
    const bugIdsSet = new Set<number>();

    for (const relation of bugsWiqlResult.workItemRelations) {
      if (!relation.source || !relation.target) {
        continue;
      }
      const userStoryId = relation.source.id;
      const bugId = relation.target.id;

      if (!userStoryId || !bugId) continue;

      bugIdsSet.add(bugId);
      if (!userStoryToBugIds.has(userStoryId)) {
        userStoryToBugIds.set(userStoryId, []);
      }
      userStoryToBugIds.get(userStoryId)!.push(bugId);
    }

    const bugIds = [...bugIdsSet];
    console.log('[DEBUG] Bug IDs from WIQL relations:', bugIds);
    console.log('[DEBUG] User Story to Bug mapping:', Object.fromEntries(userStoryToBugIds));

    // Fetch full bug work item details
    const bugItemsMap = await fetchWorkItemsByIds(bugIds);
    console.log('[DEBUG] Bug items fetched:', bugItemsMap.size);

    // Map bugs to Bug type, grouped by parent User Story
    const userStoryBugsMap = new Map<number, Bug[]>();
    for (const [userStoryId, bugIdsForStory] of userStoryToBugIds) {
      const bugs: Bug[] = [];
      for (const bugId of bugIdsForStory) {
        const bugItem = bugItemsMap.get(bugId);
        if (!bugItem) continue;

        const workItemType = bugItem.fields['System.WorkItemType'] as string;
        if (workItemType !== WORK_ITEM_TYPE_BUG) continue;

        const bugStatus = bugItem.fields['System.State'] as string;
        if (CLOSED_STATUSES.some(s => s.toLowerCase() === bugStatus.toLowerCase())) {
          continue;
        }

        // Create parent User Story info for the bug
        const parentUserStoryInfo = { id: userStoryId, title: '' };

        const bug = mapWorkItemToBug(
          bugItem,
          process.env.ADO_ORG_URL ?? '',
          parentUserStoryInfo,
          getFieldMappings()
        );
        bugs.push(bug);
      }
      if (bugs.length > 0) {
        userStoryBugsMap.set(userStoryId, bugs);
      }
    }
    console.log('[DEBUG] User Story Bugs map:', Object.fromEntries(userStoryBugsMap));

    // Create User Story entries with bugs
    for (const userStoryItem of userStoryItemsMap.values()) {
      const workItemType = userStoryItem.fields['System.WorkItemType'] as string;
      if (workItemType !== WORK_ITEM_TYPE_USER_STORY) {
        continue;
      }

      const userStoryStatus = userStoryItem.fields['System.State'] as string;
      if (CLOSED_STATUSES.some(s => s.toLowerCase() === userStoryStatus.toLowerCase())) {
        continue;
      }

      // Get parent Feature if available
      const parent = userStoryItem.fields['System.Parent'] as number | undefined;
      const parentFeature = parent && parentFeatureMap.has(parent)
        ? parentFeatureMap.get(parent)!
        : { id: parent ?? 0, title: parent ? `Feature ${parent}` : 'Unknown Feature' };

      const userStory = mapWorkItemToChildStory(
        userStoryItem,
        process.env.ADO_ORG_URL ?? '',
        parentFeature,
        getFieldMappings()
      );

      // Add bugs for this user story
      const userStoryWithBugs: QaUserStoryWithBugs = {
        ...userStory,
        bugs: userStoryBugsMap.get(userStory.id) ?? [],
      };
      userStories.push(userStoryWithBugs);
    }
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    errors.push({ id: 0, message: `Failed to query QA user stories: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'api_error' });
  }

  return { userStories, errors };
}