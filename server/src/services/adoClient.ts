import type {
  AdoWorkItem,
  AdoWorkItemBatchResponse,
  AdoWiqlQuery,
  AdoWiqlResponse,
  AdoTeam,
  AdoBoard,
  AdoBoardColumn,
} from '../types/ado.js';
import { getWorkItemsUrl, getWorkItemRelationsUrl, getWiqlUrl, getTeamsUrl, getBoardsUrl, getBoardColumnsUrl, getAuthHeader, DEFAULT_FIELDS } from '../utils/adoUrls.js';
import { chunkArray, MAX_BATCH_SIZE } from '../utils/batching.js';

interface FetchOptions {
  retries?: number;
  retryDelay?: number;
  signal?: AbortSignal;
}

class AdoClient {
  private baseHeaders: Record<string, string>;

  constructor() {
    this.baseHeaders = {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit = {},
    fetchOptions: FetchOptions = {}
  ): Promise<T> {
    const { retries = 3, retryDelay = 1000, signal } = fetchOptions;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(url, {
          ...options,
          headers: { ...this.baseHeaders, ...options.headers },
          signal: signal ? AbortSignal.any([signal, controller.signal]) : controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          const error = new Error(`ADO API error: ${response.status} ${response.statusText} - ${errorBody}`);
          (error as Error & { status?: number }).status = response.status;
          throw error;
        }

        return await response.json() as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on client errors (4xx) except 429
        const status = (lastError as Error & { status?: number }).status;
        if (status && status >= 400 && status < 500 && status !== 429) {
          throw lastError;
        }

        if (attempt < retries) {
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  async getWorkItems(ids: number[], fields?: string[]): Promise<AdoWorkItem[]> {
    if (ids.length === 0) return [];

    const chunks = chunkArray(ids, MAX_BATCH_SIZE);
    const allItems: AdoWorkItem[] = [];

    for (const chunk of chunks) {
      const url = getWorkItemsUrl(chunk, fields);
      const response = await this.fetchWithRetry<AdoWorkItemBatchResponse>(url);
      allItems.push(...response.value);
    }

    return allItems;
  }

  async getWorkItemWithRelations(id: number): Promise<AdoWorkItem> {
    const url = getWorkItemRelationsUrl(id);
    return this.fetchWithRetry<AdoWorkItem>(url);
  }

  async runWiql(query: string): Promise<AdoWiqlResponse> {
    const url = getWiqlUrl();
    const body: AdoWiqlQuery = { query };
    return this.fetchWithRetry<AdoWiqlResponse>(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getTeams(): Promise<AdoTeam[]> {
    const url = getTeamsUrl();
    const response = await this.fetchWithRetry<{ value: AdoTeam[] }>(url);
    return response.value;
  }

  async getBoards(teamId: string): Promise<AdoBoard[]> {
    const url = getBoardsUrl(teamId);
    const response = await this.fetchWithRetry<{ value: AdoBoard[] }>(url);
    return response.value;
  }

  async getBoardColumns(teamId: string, boardId: string): Promise<AdoBoardColumn[]> {
    const url = getBoardColumnsUrl(teamId, boardId);
    const response = await this.fetchWithRetry<{ value: AdoBoardColumn[] }>(url);
    return response.value;
  }

  // Helper to get board column mapping for a project
  async getBoardColumnMapping(): Promise<Map<number, string>> {
    const mapping = new Map<number, string>();

    try {
      const teams = await this.getTeams();
      if (teams.length === 0) {
        console.warn('No teams found in project');
        return mapping;
      }

      // Use the first team (could be made configurable)
      const team = teams[0];
      const boards = await this.getBoards(team.id);

      for (const board of boards) {
        if (board.columns && board.columns.length > 0) {
          const columns = await this.getBoardColumns(team.id, board.id);
          for (const column of columns) {
            // Map column ID to column name
            mapping.set(parseInt(column.id, 10), column.name);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to fetch board column mapping:', error);
    }

    return mapping;
  }
}

export const adoClient = new AdoClient();