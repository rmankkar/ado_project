import { adoClient } from './adoClient.js';
import { getFieldMappings } from './fieldMapping.js';
import { mapWorkItemToFeature } from '../types/api.js';
import { DEFAULT_FIELDS } from '../utils/adoUrls.js';
import type { Feature, FetchError } from '../types/api.js';
import type { AdoWorkItem } from '../types/ado.js';

export interface FetchFeaturesResult {
  features: Feature[];
  errors: FetchError[];
}

async function fetchWorkItemsByIds(ids: number[]): Promise<Map<number, AdoWorkItem>> {
  const fields = [
    ...DEFAULT_FIELDS,
    getFieldMappings().boardColumn,
    getFieldMappings().deployDate,
    getFieldMappings().targetDate,
    'System.IterationPath',
  ];

  const items = await adoClient.getWorkItems(ids, fields);
  const itemMap = new Map<number, AdoWorkItem>();
  for (const item of items) {
    itemMap.set(item.id, item);
  }
  return itemMap;
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

export async function fetchFeatures(ids: number[]): Promise<FetchFeaturesResult> {
  const features: Feature[] = [];
  const errors: FetchError[] = [];

  if (ids.length === 0) {
    return { features, errors };
  }

  try {
    const itemMap = await fetchWorkItemsByIds(ids);

    for (const id of ids) {
      const item = itemMap.get(id);
      if (!item) {
        errors.push({ id, message: 'Work item not found', type: 'not_found' });
        continue;
      }

      const workItemType = item.fields['System.WorkItemType'] as string;
      if (workItemType !== 'Feature') {
        errors.push({ id, message: `Work item is a "${workItemType}", not a Feature`, type: 'invalid_type' });
        continue;
      }

      try {
        const feature = mapWorkItemToFeature(item, process.env.ADO_ORG_URL ?? '');
        features.push(feature);
      } catch (mapError) {
        errors.push({
          id,
          message: `Failed to map work item: ${mapError instanceof Error ? mapError.message : 'Unknown error'}`,
          type: 'api_error',
        });
      }
    }
  } catch (error) {
    // Network or batch-level error
    const status = (error as Error & { status?: number }).status;
    for (const id of ids) {
      if (!errors.some(e => e.id === id)) {
        errors.push(classifyError(status, id));
      }
    }
  }

  return { features, errors };
}