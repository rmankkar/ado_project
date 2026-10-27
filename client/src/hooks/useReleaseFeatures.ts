import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adoApi } from '../api/ado.js';
import type { FetchReleaseFeaturesResponse, ReleaseWithFeatures, FetchReleasesResponse, ReleaseItem, FetchError } from '../types/ado.js';

interface UseFetchReleaseFeaturesOptions {
  onSuccess?: (data: FetchReleaseFeaturesResponse) => void;
  onError?: (error: Error) => void;
}

export function useFetchReleaseFeatures(options: UseFetchReleaseFeaturesOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation<FetchReleaseFeaturesResponse, Error, number[] | undefined>({
    mutationFn: (releaseIds) => adoApi.fetchReleaseFeatures(releaseIds),
    onSuccess: (data) => {
      // Store the data in the query cache for components to access
      queryClient.setQueryData(['releaseFeatures'], data);
      options.onSuccess?.(data);
    },
    onError: options.onError,
  });
}

// Hook to fetch releases for dropdown
interface UseFetchReleasesOptions {
  onSuccess?: (data: FetchReleasesResponse) => void;
  onError?: (error: Error) => void;
}

export function useFetchReleases(options: UseFetchReleasesOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation<FetchReleasesResponse, Error, void>({
    mutationFn: () => adoApi.fetchReleases(),
    onSuccess: (data) => {
      queryClient.setQueryData(['releases'], data);
      options.onSuccess?.(data);
    },
    onError: options.onError,
  });
}

// Hook to access cached release features data
export function useReleaseFeatures(): { releases: ReleaseWithFeatures[]; errors: FetchError[] } | undefined {
  const queryClient = useQueryClient();
  return queryClient.getQueryData<FetchReleaseFeaturesResponse>(['releaseFeatures']);
}

// Hook to access cached releases for dropdown
export function useReleases(): { releases: ReleaseItem[]; errors: FetchError[] } | undefined {
  const queryClient = useQueryClient();
  return queryClient.getQueryData<FetchReleasesResponse>(['releases']);
}

export function useClearReleaseFeatures() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.removeQueries({ queryKey: ['releaseFeatures'] });
  };
}