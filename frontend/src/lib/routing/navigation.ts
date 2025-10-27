/**
 * Type-safe navigation helpers for TanStack Router
 * Eliminates the need for `as any` type casts in navigation calls
 */

import type { NavigateOptions } from "@tanstack/react-router";
import { serializeObjectsSearch, type ObjectsSearchState } from "../../features/objects/search";

/**
 * Navigation parameters for bucket routes
 */
interface BucketNavigationParams {
  bucket: string;
  search: ObjectsSearchState;
}

/**
 * Navigation parameters for object routes
 */
interface ObjectNavigationParams extends BucketNavigationParams {
  objectKey: string;
}

/**
 * Create navigation options for bucket objects list page
 *
 * @param params - Bucket and search state
 * @param options - Additional navigation options (e.g., replace)
 * @returns Type-safe NavigateOptions for TanStack Router
 *
 * @example
 * navigate(createBucketNavigation({ bucket: "my-bucket", search }));
 */
export function createBucketNavigation(
  params: BucketNavigationParams,
  options?: Partial<NavigateOptions>,
): NavigateOptions {
  return {
    to: "/b/$bucket",
    params: { bucket: params.bucket },
    search: serializeObjectsSearch(params.search),
    ...options,
  } as NavigateOptions;
}

/**
 * Create navigation options for object details page
 *
 * @param params - Bucket, object key, and search state
 * @param options - Additional navigation options
 * @returns Type-safe NavigateOptions for TanStack Router
 *
 * @example
 * navigate(createObjectNavigation({ bucket, objectKey, search }));
 */
export function createObjectNavigation(
  params: ObjectNavigationParams,
  options?: Partial<NavigateOptions>,
): NavigateOptions {
  return {
    to: "/b/$bucket/o/$objectKey+",
    params: {
      bucket: params.bucket,
      "objectKey+": params.objectKey,
    },
    search: serializeObjectsSearch(params.search),
    ...options,
  } as NavigateOptions;
}

/**
 * Create navigation options for upload page
 *
 * @param params - Bucket and search state
 * @param options - Additional navigation options
 * @returns Type-safe NavigateOptions for TanStack Router
 *
 * @example
 * navigate(createUploadNavigation({ bucket, search }));
 */
export function createUploadNavigation(
  params: BucketNavigationParams,
  options?: Partial<NavigateOptions>,
): NavigateOptions {
  return {
    to: "/b/$bucket/upload",
    params: { bucket: params.bucket },
    search: serializeObjectsSearch(params.search),
    ...options,
  } as NavigateOptions;
}

/**
 * Update search parameters while staying on current page
 *
 * @param currentParams - Current bucket and search state
 * @param updates - Search state updates to apply
 * @param replace - Whether to replace history (default: true for filters)
 * @returns Type-safe NavigateOptions for TanStack Router
 *
 * @example
 * // Update sort order
 * navigate(updateBucketSearch({ bucket, search }, { sort: "name", order: "asc" }));
 *
 * // Change page (push to history)
 * navigate(updateBucketSearch({ bucket, search }, { pageIndex: 2 }, false));
 */
export function updateBucketSearch(
  currentParams: BucketNavigationParams,
  updates: Partial<ObjectsSearchState>,
  replace: boolean = true,
): NavigateOptions {
  return createBucketNavigation(
    {
      bucket: currentParams.bucket,
      search: { ...currentParams.search, ...updates },
    },
    { replace },
  );
}
