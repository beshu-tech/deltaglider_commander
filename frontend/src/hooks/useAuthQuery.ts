/**
 * useAuthQuery - Wrapper for TanStack Query with automatic auth handling
 *
 * This hook eliminates duplication across all authenticated query hooks by:
 * 1. Automatically disabling queries when no active profile exists
 * 2. Conditionally enabling polling based on connection health
 * 3. Providing consistent auth behavior across the entire application
 *
 * Usage:
 * ```typescript
 * export function useBuckets(options?: UseBucketsOptions) {
 *   return useAuthQuery<Bucket[]>({
 *     queryKey: qk.buckets,
 *     queryFn: fetchBuckets,
 *     ...options,
 *   });
 * }
 * ```
 */

import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query";
import { useAuthStore, selectHasActiveProfile, selectConnectionState } from "../stores/authStore";
import { getPollMs } from "../lib/config/env";

/**
 * TanStack Query wrapper that automatically handles auth state
 *
 * @param options - Query options (queryKey, queryFn, etc.)
 * @returns Query result with automatic auth handling
 */
export function useAuthQuery<TData, TError = Error>(
  options: UseQueryOptions<TData, TError>,
): UseQueryResult<TData, TError> {
  // Subscribe to auth state reactively
  const hasActiveProfile = useAuthStore(selectHasActiveProfile);
  const connectionState = useAuthStore(selectConnectionState);

  // Compute enabled state
  // Only enable query if:
  // 1. There's an active profile with credentials
  // 2. Options don't explicitly disable it
  const shouldEnableQuery = hasActiveProfile && (options.enabled ?? true);

  // Compute refetchInterval
  // Only enable automatic refetching when connection is healthy
  const computedRefetchInterval =
    options.refetchInterval !== undefined
      ? options.refetchInterval // Explicit override
      : connectionState === "error"
        ? false // Don't poll on client errors (auth failures handled by global config)
        : getPollMs(); // Default polling interval

  return useQuery<TData, TError>({
    ...options,
    enabled: shouldEnableQuery,
    refetchInterval: computedRefetchInterval,
  });
}
