import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adoApi } from '../api/ado.js';
import type { Feature, FetchFeaturesResponse, FetchError } from '../types/ado.js';

export function useFetchFeatures() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => adoApi.fetchFeatures(ids),
    onSuccess: (data: FetchFeaturesResponse) => {
      queryClient.setQueryData(['features'], data.features);
      queryClient.setQueryData(['fetchErrors'], data.errors);
    },
  });
}

export function useFeatures(): Feature[] {
  const queryClient = useQueryClient();
  return queryClient.getQueryData(['features']) ?? [];
}

export function useFetchErrors(): FetchError[] {
  const queryClient = useQueryClient();
  return queryClient.getQueryData(['fetchErrors']) ?? [];
}

export function useClearFeatures() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.setQueryData(['features'], []);
    queryClient.setQueryData(['fetchErrors'], []);
    queryClient.setQueryData(['childStories'], []);
    queryClient.setQueryData(['childStoryErrors'], []);
  };
}