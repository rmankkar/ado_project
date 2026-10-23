import { useMutation } from '@tanstack/react-query';
import { adoApi } from '../api/ado.js';
import type { FetchCommentsResponse } from '../types/ado.js';

interface UseFetchCommentsOptions {
  onSuccess?: (data: FetchCommentsResponse) => void;
  onError?: (error: Error) => void;
}

export function useFetchComments(options: UseFetchCommentsOptions = {}) {
  return useMutation<FetchCommentsResponse, Error, number>({
    mutationFn: (workItemId: number) => adoApi.fetchComments(workItemId),
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}