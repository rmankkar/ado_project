export interface AdoWorkItem {
  id: number;
  rev: number;
  fields: AdoWorkItemFields;
  relations?: AdoWorkItemRelation[];
  url: string;
}

export interface AdoWorkItemFields {
  'System.Id': number;
  'System.Title': string;
  'System.State': string;
  'System.WorkItemType': string;
  'System.AssignedTo'?: AdoIdentityRef;
  'System.CreatedDate': string;
  'System.ChangedDate': string;
  'System.TeamProject': string;
  'System.AreaPath': string;
  'System.IterationPath': string;
  'System.Tags'?: string;
  [key: string]: unknown;
}

export interface AdoIdentityRef {
  displayName: string;
  uniqueName: string;
  id: string;
  imageUrl?: string;
  descriptor?: string;
}

export interface AdoWorkItemRelation {
  rel: string;
  url: string;
  attributes?: {
    name?: string;
    isLocked?: boolean;
    comment?: string;
  };
}

export interface AdoWorkItemBatchRequest {
  ids: number[];
  fields?: string[];
}

export interface AdoWorkItemBatchResponse {
  value: AdoWorkItem[];
  count: number;
}

export interface AdoWiqlQuery {
  query: string;
}

export interface AdoWiqlResponse {
  queryType: string;
  queryResultType: string;
  asOf: string;
  columns: AdoWiqlColumn[];
  workItems: AdoWiqlWorkItemRef[];
  workItemRelations: AdoWiqlWorkItemRelation[];
}

export interface AdoWiqlColumn {
  referenceName: string;
  name: string;
  url: string;
}

export interface AdoWiqlWorkItemRef {
  id: number;
  url: string;
}

export interface AdoWiqlWorkItemRelation {
  source: AdoWiqlWorkItemRef;
  target: AdoWiqlWorkItemRef;
  rel: AdoWiqlRelation;
}

export interface AdoWiqlRelation {
  rel: string;
  referenceName: string;
  url: string;
}

export interface AdoBoard {
  id: string;
  name: string;
  url: string;
  columns: AdoBoardColumn[];
}

export interface AdoBoardColumn {
  id: string;
  name: string;
  itemLimit: number | null;
  columnType: string;
}

export interface AdoTeam {
  id: string;
  name: string;
  url: string;
  projectId: string;
  projectName: string;
}

export interface AdoProject {
  id: string;
  name: string;
  url: string;
  state: string;
  revision: number;
  visibility: string;
}