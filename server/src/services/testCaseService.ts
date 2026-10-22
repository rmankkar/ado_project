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
      AND [Target].[System.State] NOT IN ('Closed', 'Removed')
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

    // Extract unique test case work item IDs from the target work items in relations
    const testCaseIds = [...new Set(wiqlResult.workItemRelations.map(r => r.target.id))];
    console.log('[DEBUG] Test Case IDs from WIQL:', testCaseIds);

    if (testCaseIds.length === 0) {
      return { testCases: [], errors: [] };
    }

    // Fetch full work item details for test cases
    const testCaseItemsMap = await fetchWorkItemsByIds(testCaseIds);
    console.log('[DEBUG] Test Case items fetched:', testCaseItemsMap.size);

    // Collect parent User Story IDs from the test cases (System.Parent field)
    const parentIds: number[] = [];
    for (const testCaseItem of testCaseItemsMap.values()) {
      const parent = testCaseItem.fields['System.Parent'] as number | undefined;
      console.log('[DEBUG] Test Case', testCaseItem.id, 'System.Parent:', parent);
      if (parent) {
        console.log('[DEBUG] Adding parent User Story ID:', parent);
        parentIds.push(parent);
      }
    }
    console.log('[DEBUG] Collected parent User Story IDs:', parentIds);

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

      // Get parent User Story if available
      const parent = testCaseItem.fields['System.Parent'] as number | undefined;
      const parentInfo = parent
        ? { id: parent, title: parentTitleMap.get(parent) ?? `User Story ${parent}` }
        : null;

      const testCase = mapWorkItemToTestCase(
        testCaseItem,
        process.env.ADO_ORG_URL ?? '',
        parentInfo
      );
      testCases.push(testCase);
    }
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    errors.push({ id: 0, message: `Failed to query test cases: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'api_error' });
  }

  return { testCases, errors };
}