import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adoApi } from '../api/ado.js';
import type { ChildUserStory, FetchError } from '../types/ado.js';

export function useFetchQaUserStories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (iterationPath: string) => adoApi.fetchQaUserStories(iterationPath),
    onSuccess: (data) => {
      queryClient.setQueryData(['qaUserStories'], data.userStories);
      queryClient.setQueryData(['qaUserStoriesErrors'], data.errors);
    },
  });
}

export function useQaUserStories(): ChildUserStory[] {
  const queryClient = useQueryClient();
  return queryClient.getQueryData(['qaUserStories']) ?? [];
}

export function useQaUserStoriesErrors(): FetchError[] {
  const queryClient = useQueryClient();
  return queryClient.getQueryData(['qaUserStoriesErrors']) ?? [];
}

export function useClearQaUserStories() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.setQueryData(['qaUserStories'], []);
    queryClient.setQueryData(['qaUserStoriesErrors'], []);
  };
}