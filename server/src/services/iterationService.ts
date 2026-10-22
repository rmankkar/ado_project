import { adoClient } from './adoClient.js';
import { env } from '../config/env.js';
import type { Iteration, FetchError } from '../types/api.js';
import type { AdoIterationNode } from '../types/ado.js';

export interface FetchIterationsResult {
  iterations: Iteration[];
  errors: FetchError[];
}

/**
 * Converts AdoIterationNode children to our Iteration type
 * The API now returns the specific iteration node's children (e.g., PI22.1, PI22.2, etc.)
 */
function convertIterationNodes(nodes: AdoIterationNode[], parentPath: string): Iteration[] {
  return nodes.map(node => ({
    id: node.id,
    name: node.name,
    path: `${parentPath}\\${node.name}`,
    startDate: node.attributes?.startDate ?? null,
    finishDate: node.attributes?.finishDate ?? null,
    structureType: node.structureType,
    hasChildren: node.hasChildren,
    url: node.url,
  }));
}

export async function fetchIterations(): Promise<FetchIterationsResult> {
  const basePath = env.adoIterationBasePath;
  const iterations: Iteration[] = [];
  const errors: FetchError[] = [];

  try {
    // Fetch iterations via REST API (Classification Nodes)
    // The URL is constructed to target the specific iteration (e.g., /Iterations/Iteration/SE/PI22)
    // $depth=3 gets the target node + 2 levels of children
    const nodes = await adoClient.getIterations(3);

    if (!nodes || nodes.length === 0) {
      return { iterations: [], errors: [] };
    }

    // The nodes returned are already the children of the targeted iteration (e.g., PI22's children: PI22.1, PI22.2, etc.)
    // We just need to convert them to our Iteration type
    // Get the parent path from the base path (e.g., "Global_Data_Project\Iteration\SE\PI22")
    const parentPath = basePath
      ? basePath.replace(/^\\+|\\+$/g, '').replace(/\//g, '\\')
      : 'Iterations';

    const flatIterations = convertIterationNodes(nodes, parentPath);

    // Sort by start date descending (most recent first)
    flatIterations.sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return dateB - dateA;
    });

    return { iterations: flatIterations, errors: [] };
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    errors.push({
      id: 0,
      message: `Failed to fetch iterations: ${error instanceof Error ? error.message : 'Unknown error'}`,
      type: 'api_error'
    });
  }

  return { iterations, errors };
}