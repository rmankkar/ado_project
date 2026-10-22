import { useQueryClient } from '@tanstack/react-query';
import type { Feature, ChildUserStory } from '../types/ado.js';

export interface StatusCount {
  status: string;
  count: number;
}

export interface FeatureReportData {
  feature: Feature;
  childStories: ChildUserStory[];
  statusCounts: StatusCount[];
  boardColumnCounts: StatusCount[];
  totalChildStories: number;
}

export function useReportData(): {
  featureStatusCounts: StatusCount[];
  featureReports: FeatureReportData[];
  totalFeatures: number;
  totalChildStories: number;
  generatedAt: string;
} {
  const queryClient = useQueryClient();
  const features = queryClient.getQueryData<Feature[]>(['features']) ?? [];
  const childStories = queryClient.getQueryData<ChildUserStory[]>(['childStories']) ?? [];

  // Feature status counts
  const featureStatusMap = new Map<string, number>();
  for (const feature of features) {
    featureStatusMap.set(feature.status, (featureStatusMap.get(feature.status) ?? 0) + 1);
  }
  const featureStatusCounts: StatusCount[] = Array.from(featureStatusMap.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  // Group child stories by parent feature
  const childStoriesByParent = new Map<number, ChildUserStory[]>();
  for (const story of childStories) {
    const parentId = story.parentFeature.id;
    if (!childStoriesByParent.has(parentId)) {
      childStoriesByParent.set(parentId, []);
    }
    childStoriesByParent.get(parentId)!.push(story);
  }

  // Build feature reports
  const featureReports: FeatureReportData[] = features.map(feature => {
    const stories = childStoriesByParent.get(feature.id) ?? [];
    const statusMap = new Map<string, number>();
    const boardColumnMap = new Map<string, number>();
    for (const story of stories) {
      statusMap.set(story.status, (statusMap.get(story.status) ?? 0) + 1);
      const boardColumn = story.boardColumn ?? 'Unmapped';
      boardColumnMap.set(boardColumn, (boardColumnMap.get(boardColumn) ?? 0) + 1);
    }
    const statusCounts: StatusCount[] = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
    const boardColumnCounts: StatusCount[] = Array.from(boardColumnMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    return {
      feature,
      childStories: stories,
      statusCounts,
      boardColumnCounts,
      totalChildStories: stories.length,
    };
  });

  const totalChildStories = childStories.length;

  return {
    featureStatusCounts,
    featureReports,
    totalFeatures: features.length,
    totalChildStories,
    generatedAt: new Date().toISOString(),
  };
}