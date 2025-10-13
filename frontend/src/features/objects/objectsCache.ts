import { fetchObjects } from "../../lib/api/endpoints";
import { ObjectItem, ObjectSortKey } from "./types";

/**
 * Complete directory cache with all objects and subdirectories
 */
export interface DirectoryCache {
  objects: ObjectItem[];
  directories: string[];
  totalObjects: number;
  totalDirectories: number;
}

/**
 * Parameters for fetching all objects in a directory
 */
export interface FetchAllObjectsParams {
  bucket: string;
  prefix?: string;
  search?: string;
  compressed?: "true" | "false" | "any";
  onProgress?: (loaded: number, total: number | undefined) => void;
  onPreviewReady?: (preview: DirectoryCache) => void;
}

/**
 * Fetches all objects in a directory using two-stage loading:
 * 1. Quick preview: First 100 items WITHOUT metadata (fast)
 * 2. Full data: ALL items WITH metadata (complete)
 *
 * This allows us to show a preview immediately while loading the full dataset in the background.
 *
 * @param params - Fetch parameters
 * @returns Complete directory cache with all objects and directories
 */
export async function fetchAllObjects(params: FetchAllObjectsParams): Promise<DirectoryCache> {
  const { bucket, prefix, search, compressed, onProgress, onPreviewReady } = params;

  // Stage 1: Quick preview (first 100 items, no metadata)
  if (onPreviewReady) {
    console.log("[objectsCache] Stage 1: Fetching quick preview (100 items, no metadata)");
    const previewResponse = await fetchObjects({
      bucket,
      prefix,
      search,
      cursor: undefined,
      limit: 100,
      sort: "name",
      order: "asc",
      compressed,
      fetchMetadata: false, // FAST: Skip metadata
    });

    console.log(
      `[objectsCache] Preview ready: ${previewResponse.objects.length} objects, ${previewResponse.common_prefixes.length} dirs`,
    );

    // Provide quick preview to UI immediately
    onPreviewReady({
      objects: previewResponse.objects,
      directories: previewResponse.common_prefixes,
      totalObjects: previewResponse.objects.length,
      totalDirectories: previewResponse.common_prefixes.length,
    });
  }

  // Stage 2: Full data fetch (all items, with metadata)
  console.log("[objectsCache] Stage 2: Fetching full data (all items, with metadata)");
  const allObjects: ObjectItem[] = [];
  const allDirectories = new Set<string>();
  let cursor: string | undefined;
  let pageCount = 0;

  do {
    pageCount++;
    const response = await fetchObjects({
      bucket,
      prefix,
      search,
      cursor,
      limit: 500, // Use larger page size for efficiency
      sort: "name",
      order: "asc",
      compressed,
      fetchMetadata: true, // COMPLETE: Include all metadata
    });

    allObjects.push(...response.objects);
    response.common_prefixes.forEach((dir) => allDirectories.add(dir));

    // Report progress
    if (onProgress) {
      onProgress(allObjects.length, undefined);
    }

    cursor = response.cursor ?? undefined;
    if (cursor) {
      console.log(
        `[objectsCache] Fetching page ${pageCount + 1}, loaded so far: ${allObjects.length}`,
      );
    } else {
      console.log(`[objectsCache] Full fetch complete: ${allObjects.length} objects total`);
    }
  } while (cursor);

  return {
    objects: allObjects,
    directories: Array.from(allDirectories),
    totalObjects: allObjects.length,
    totalDirectories: allDirectories.size,
  };
}

/**
 * Sorts objects array by the specified key and order.
 * This is used for client-side sorting without network requests.
 *
 * @param objects - Array of objects to sort
 * @param sortKey - Key to sort by (name, size, modified)
 * @param order - Sort order (asc or desc)
 * @returns Sorted array (new array, does not mutate input)
 */
export function sortObjects(
  objects: ObjectItem[],
  sortKey: ObjectSortKey,
  order: "asc" | "desc",
): ObjectItem[] {
  const sorted = [...objects].sort((a, b) => {
    let comparison = 0;

    switch (sortKey) {
      case "name":
        comparison = a.key.localeCompare(b.key);
        break;
      case "size":
        comparison = a.original_bytes - b.original_bytes;
        break;
      case "modified":
        comparison = new Date(a.modified).getTime() - new Date(b.modified).getTime();
        break;
    }

    return order === "asc" ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Sorts directories array by name.
 * Directories are sorted by name only (size/modified don't apply to directories).
 *
 * @param directories - Array of directory prefixes to sort
 * @param order - Sort order (asc or desc)
 * @returns Sorted array (new array, does not mutate input)
 */
export function sortDirectories(directories: string[], order: "asc" | "desc" = "asc"): string[] {
  const sorted = [...directories].sort((a, b) => a.localeCompare(b));
  return order === "desc" ? sorted.reverse() : sorted;
}

/**
 * Paginates an array of objects for client-side pagination.
 *
 * @param objects - Full array of objects
 * @param pageIndex - Zero-based page index
 * @param pageSize - Number of items per page
 * @returns Paginated slice of the array
 */
export function paginateObjects(
  objects: ObjectItem[],
  pageIndex: number,
  pageSize: number,
): ObjectItem[] {
  const offset = pageIndex * pageSize;
  return objects.slice(offset, offset + pageSize);
}

/**
 * Paginates an array of directories for client-side pagination.
 * Directories appear before objects, so they're paginated separately.
 *
 * @param directories - Full array of directory prefixes
 * @param pageIndex - Zero-based page index
 * @param pageSize - Number of items per page
 * @param objectsOnPage - Number of objects already shown on this page
 * @returns Paginated slice of the array and how many were included
 */
export function paginateDirectories(
  directories: string[],
  pageIndex: number,
  pageSize: number,
  objectsOnPage: number,
): { directories: string[]; count: number } {
  const offset = pageIndex * pageSize;
  const remainingSpace = pageSize - objectsOnPage;

  if (remainingSpace <= 0) {
    return { directories: [], count: 0 };
  }

  const startIndex = Math.max(0, offset - objectsOnPage);
  const endIndex = startIndex + remainingSpace;
  const slice = directories.slice(startIndex, endIndex);

  return { directories: slice, count: slice.length };
}

/**
 * Calculates pagination metadata for a cached directory.
 *
 * @param totalItems - Total number of items (objects + directories)
 * @param pageIndex - Current zero-based page index
 * @param pageSize - Number of items per page
 * @returns Pagination metadata
 */
export function calculatePaginationInfo(
  totalItems: number,
  pageIndex: number,
  pageSize: number,
): {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startIndex: number;
  endIndex: number;
} {
  const totalPages = Math.ceil(totalItems / pageSize);
  const currentPage = pageIndex + 1; // Convert to 1-based for display

  return {
    currentPage,
    totalPages,
    hasNextPage: pageIndex < totalPages - 1,
    hasPreviousPage: pageIndex > 0,
    startIndex: pageIndex * pageSize,
    endIndex: Math.min((pageIndex + 1) * pageSize, totalItems),
  };
}

/**
 * Clears all cached object listings from localStorage and TanStack Query cache.
 * This forces fresh data fetch on next directory access.
 */
export function clearObjectsCache(): void {
  // Clear localStorage items that store object cache backups
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("tanstack-query-")) {
      localStorage.removeItem(key);
    }
  });

  console.log("[objectsCache] Cleared all cached object listings from localStorage");
}
