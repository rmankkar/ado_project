import { env, getIterationApiPath } from '../config/env.js';

const API_VERSION = '7.1';

export function getWorkItemsUrl(ids: number[], fields?: string[]): string {
  const idsParam = ids.join(',');
  const fieldsParam = fields ? `&fields=${fields.join(',')}` : '';
  return `${env.adoOrgUrl}/${encodeURIComponent(env.adoProject)}/_apis/wit/workitems?ids=${idsParam}${fieldsParam}&api-version=${API_VERSION}`;
}

export function getWorkItemRelationsUrl(id: number): string {
  return `${env.adoOrgUrl}/${encodeURIComponent(env.adoProject)}/_apis/wit/workitems/${id}?$expand=relations&api-version=${API_VERSION}`;
}

export function getWiqlUrl(): string {
  return `${env.adoOrgUrl}/${encodeURIComponent(env.adoProject)}/_apis/wit/wiql?api-version=${API_VERSION}`;
}

export function getTeamsUrl(): string {
  return `${env.adoOrgUrl}/${encodeURIComponent(env.adoProject)}/_apis/projects/${encodeURIComponent(env.adoProject)}/teams?api-version=${API_VERSION}`;
}

export function getBoardsUrl(teamId: string): string {
  return `${env.adoOrgUrl}/${encodeURIComponent(env.adoProject)}/${teamId}/_apis/work/boards?api-version=${API_VERSION}`;
}

export function getBoardColumnsUrl(teamId: string, boardId: string): string {
  return `${env.adoOrgUrl}/${encodeURIComponent(env.adoProject)}/${teamId}/_apis/work/boards/${boardId}/columns?api-version=${API_VERSION}`;
}

export function getIterationsUrl(depth: number = 3): string {
  const apiPath = getIterationApiPath();
  if (apiPath) {
    return `${env.adoOrgUrl}/${encodeURIComponent(env.adoProject)}/_apis/wit/classificationNodes/Iterations/${apiPath}?api-version=${API_VERSION}&$depth=${depth}`;
  }
  // Fallback to root iterations if no base path configured
  return `${env.adoOrgUrl}/${encodeURIComponent(env.adoProject)}/_apis/wit/classificationNodes/Iterations?api-version=${API_VERSION}&$depth=${depth}`;
}

export function getWorkItemCommentsUrl(id: number): string {
  return `${env.adoOrgUrl}/${encodeURIComponent(env.adoProject)}/_apis/wit/workitems/${id}/comments?api-version=${API_VERSION}-preview`;
}

export function getAuthHeader(): string {
  const token = Buffer.from(`:${env.adoPat}`).toString('base64');
  return `Basic ${token}`;
}

export const DEFAULT_FIELDS = [
  'System.Id',
  'System.Title',
  'System.State',
  'System.WorkItemType',
  'System.AssignedTo',
  'System.TeamProject',
  'System.CreatedDate',
  'System.ChangedDate',
];