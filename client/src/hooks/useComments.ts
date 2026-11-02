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

interface UseFetchCommentsBatchOptions {
  onSuccess?: (data: { lastCommentDates: { workItemId: number; lastCommentDate: string | null }[]; errors: { id: number; message: string; type: string }[] }) => void;
  onError?: (error: Error) => void;
}

interface LastCommentDate {
  workItemId: number;
  lastCommentDate: string | null;
}

export function useFetchCommentsBatch(options: UseFetchCommentsBatchOptions = {}) {
  return useMutation<{ lastCommentDates: LastCommentDate[]; errors: { id: number; message: string; type: string }[] }, Error, number[]>({
    mutationFn: (ids: number[]) => adoApi.fetchCommentsBatch(ids),
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}