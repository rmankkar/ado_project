import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adoApi } from '../api/ado.js';
import type { Bug, FetchError } from '../types/ado.js';

export function useFetchBugs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (iterationPath: string) => adoApi.fetchBugs(iterationPath),
    onSuccess: (data) => {
      queryClient.setQueryData(['bugs'], data.bugs);
      queryClient.setQueryData(['bugErrors'], data.errors);
    },
  });
}

export function useBugs(): Bug[] {
  const queryClient = useQueryClient();
  return queryClient.getQueryData(['bugs']) ?? [];
}

export function useBugErrors(): FetchError[] {
  const queryClient = useQueryClient();
  return queryClient.getQueryData(['bugErrors']) ?? [];
}

export function useClearBugs() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.setQueryData(['bugs'], []);
    queryClient.setQueryData(['bugErrors'], []);
  };
}