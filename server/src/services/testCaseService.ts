import { adoClient } from './adoClient.js';
import { getFieldMappings } from './fieldMapping.js';
import { mapWorkItemToTestCase } from '../types/api.js';
import { DEFAULT_FIELDS } from '../utils/adoUrls.js';
import { env } from '../config/env.js';
import type { TestCase, FetchError } from '../types/api.js';
import type { AdoWorkItem } from '../types/ado.js';

export interface FetchTestCasesResult {
  testCases: TestCase[];
  errors: FetchError[];
}

const WORK_ITEM_TYPE_TEST_CASE = 'Test Case';
const WORK_ITEM_TYPE_USER_STORY = 'User Story';
const TESTED_BY_LINK_TYPE = 'Microsoft.VSTS.Common.TestedBy-Forward';
const CLOSED_STATUSES = ['Closed', 'Removed', 'Done', 'Resolved'];

function buildTestCasesQuery(iterationPath: string): string {
  // Escape single quotes in iteration path
  const escapedIterationPath = iterationPath.replace(/'/g, "''");
  const escapedAreaPath = 'Global_Data_Project\\B2B\\B2B Blackhawks'.replace(/'/g, "''");
  return `
    SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType],
           [System.AssignedTo], [System.TeamProject], [System.BoardColumn],
           [System.CreatedDate], [System.ChangedDate],
           [Microsoft.VSTS.TCM.AutomationStatus], [Microsoft.VSTS.Common.Priority]
    FROM WorkItemLinks
    WHERE [Source].[System.IterationPath] UNDER '${escapedIterationPath}'
      AND [Source].[System.areaPath] UNDER '${escapedAreaPath}'
      AND [Source].[System.WorkItemType] = '${WORK_ITEM_TYPE_USER_STORY}'
      AND [System.Links.LinkType] = '${TESTED_BY_LINK_TYPE}'
      AND [Target].[System.WorkItemType] = '${WORK_ITEM_TYPE_TEST_CASE}'
    ORDER BY [Target].[System.Id]
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
    'Custom.Complexity',
    'System.Tags',
    'System.CreatedBy',
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
    console.log('[DEBUG] Fetching parent items for Test Case User Stories IDs:', uniqueParentIds);
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
    console.error('[DEBUG] Error fetching parent User Stories for test cases:', error);
    // If we can't fetch parent titles, we'll continue without them
  }

  console.log('[DEBUG] Final parent title map for test cases:', Object.fromEntries(parentMap));
  return parentMap;
}

export async function fetchTestCases(iterationPath: string): Promise<FetchTestCasesResult> {
  const testCases: TestCase[] = [];
  const errors: FetchError[] = [];

  if (!iterationPath) {
    return { testCases, errors };
  }

  try {
    // Run WIQL to get Test Cases linked to User Stories in the iteration via TestedBy relation
    const query = buildTestCasesQuery(iterationPath);
    console.log('[DEBUG] Test Case WIQL Query:', query);
    const wiqlResult = await adoClient.runWiql(query);
    console.log('[DEBUG] Test Case WIQL Result workItemRelations count:', wiqlResult.workItemRelations.length);

    if (wiqlResult.workItemRelations.length === 0) {
      return { testCases: [], errors: [] };
    }

    // Build a map of Test Case ID -> array of Parent User Story IDs from the relations
    const testCaseToParentIds = new Map<number, number[]>();
    const testCaseIdsSet = new Set<number>();
    const parentIdsSet = new Set<number>();

    for (const relation of wiqlResult.workItemRelations) {
      // Skip relations with missing source or target
      if (!relation.source || !relation.target) {
        console.log('[DEBUG] Skipping relation with missing source or target:', relation);
        continue;
      }
      const testCaseId = relation.target.id;
      const parentUserStoryId = relation.source.id;

      if (!testCaseId || !parentUserStoryId) {
        console.log('[DEBUG] Skipping relation with missing IDs:', relation);
        continue;
      }

      testCaseIdsSet.add(testCaseId);
      parentIdsSet.add(parentUserStoryId);

      if (!testCaseToParentIds.has(testCaseId)) {
        testCaseToParentIds.set(testCaseId, []);
      }
      testCaseToParentIds.get(testCaseId)!.push(parentUserStoryId);
    }

    const testCaseIds = [...testCaseIdsSet];
    const parentIds = [...parentIdsSet];

    console.log('[DEBUG] Test Case IDs from WIQL:', testCaseIds);
    console.log('[DEBUG] Parent User Story IDs from WIQL relations:', parentIds);
    console.log('[DEBUG] Test Case to Parent mapping:', Object.fromEntries(testCaseToParentIds));

    // Fetch full work item details for test cases
    const testCaseItemsMap = await fetchWorkItemsByIds(testCaseIds);
    console.log('[DEBUG] Test Case items fetched:', testCaseItemsMap.size);

    // Fetch parent User Story titles in batch
    const parentTitleMap = await fetchParentUserStories(parentIds);
    console.log('[DEBUG] Parent User Story title map:', Object.fromEntries(parentTitleMap));

    // Create TestCase entries
    for (const testCaseItem of testCaseItemsMap.values()) {
      const workItemType = testCaseItem.fields['System.WorkItemType'] as string;
      if (workItemType !== WORK_ITEM_TYPE_TEST_CASE) {
        continue; // Should not happen with our query, but safe check
      }

      const testCaseStatus = testCaseItem.fields['System.State'] as string;
      // Double-check filter (in case WIQL didn't filter properly)
      if (CLOSED_STATUSES.some(s => s.toLowerCase() === testCaseStatus.toLowerCase())) {
        continue;
      }

      // Get parent User Stories from the TestedBy relations (not System.Parent)
      const parentIdsForTestCase = testCaseToParentIds.get(testCaseItem.id) ?? [];
      const parentInfos = parentIdsForTestCase
        .map(parentId => ({
          id: parentId,
          title: parentTitleMap.get(parentId) ?? `User Story ${parentId}`,
          url: '' // Will be filled in mapWorkItemToTestCase
        }))
        .filter(p => p.title && p.id);

      const testCase = mapWorkItemToTestCase(
        testCaseItem,
        process.env.ADO_ORG_URL ?? '',
        parentInfos
      );
      testCases.push(testCase);
    }
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    errors.push({ id: 0, message: `Failed to query test cases: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'api_error' });
  }

  return { testCases, errors };
}