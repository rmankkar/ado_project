import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adoApi } from '../api/ado.js';
import type { TestCase, FetchError } from '../types/ado.js';

export function useFetchTestCases() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (iterationPath: string) => adoApi.fetchTestCases(iterationPath),
    onSuccess: (data) => {
      queryClient.setQueryData(['testCases'], data.testCases);
      queryClient.setQueryData(['testCaseErrors'], data.errors);
    },
  });
}

export function useTestCases(): TestCase[] {
  const queryClient = useQueryClient();
  return queryClient.getQueryData(['testCases']) ?? [];
}

export function useTestCaseErrors(): FetchError[] {
  const queryClient = useQueryClient();
  return queryClient.getQueryData(['testCaseErrors']) ?? [];
}

export function useClearTestCases() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.setQueryData(['testCases'], []);
    queryClient.setQueryData(['testCaseErrors'], []);
  };
}