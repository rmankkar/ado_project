import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adoApi } from '../api/ado.js';
import type { ChildUserStory, FetchChildStoriesResponse, FetchError } from '../types/ado.js';

export function useFetchChildStories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (featureIds: number[]) => adoApi.fetchChildStories(featureIds),
    onSuccess: (data: FetchChildStoriesResponse) => {
      queryClient.setQueryData(['childStories'], data.childStories);
      queryClient.setQueryData(['childStoryErrors'], data.errors);
    },
  });
}

export function useChildStories(): ChildUserStory[] {
  const queryClient = useQueryClient();
  return queryClient.getQueryData(['childStories']) ?? [];
}

export function useChildStoryErrors(): FetchError[] {
  const queryClient = useQueryClient();
  return queryClient.getQueryData(['childStoryErrors']) ?? [];
}

export function useClearChildStories() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.setQueryData(['childStories'], []);
    queryClient.setQueryData(['childStoryErrors'], []);
  };
}