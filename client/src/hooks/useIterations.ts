import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adoApi } from '../api/ado.js';
import type { Iteration, FetchError } from '../types/ado.js';

export function useFetchIterations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => adoApi.fetchIterations(),
    onSuccess: (data) => {
      queryClient.setQueryData(['iterations'], data.iterations);
      queryClient.setQueryData(['iterationErrors'], data.errors);
    },
  });
}

export function useIterations(): Iteration[] {
  const queryClient = useQueryClient();
  return queryClient.getQueryData(['iterations']) ?? [];
}

export function useIterationErrors(): FetchError[] {
  const queryClient = useQueryClient();
  return queryClient.getQueryData(['iterationErrors']) ?? [];
}