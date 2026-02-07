import { fetchObjects } from "../../lib/api/endpoints";
import { ObjectItem, ObjectSortKey } from "./types";

// Set to true to enable debug logging for cache operations
const DEBUG_CACHE = false;

// Hard cap: stop fetching once we have this many objects in the browser.
// Matches the backend LISTING_MAX_OBJECTS so both sides agree on the ceiling.
const MAX_CLIENT_OBJECTS = 15_000;

/**
 * ObjectItem with pre-computed fields for fast search and sort.
 * Extends ObjectItem so it's assignable everywhere ObjectItem is expected.
 */
export interface IndexedObjectItem extends ObjectItem {
  /** Pre-computed key.toLowerCase() — avoids repeated allocation during search */
  _keyLower: string;
  /** Pre-parsed Date.parse(modified) — avoids repeated parsing during date sort */
  _modifiedMs: number;
}

function indexObject(obj: ObjectItem): IndexedObjectItem {
  return {
    ...obj,
    _keyLower: obj.key.toLowerCase(),
    _modifiedMs: Date.parse(obj.modified),
  };
}

function indexObjects(objects: ObjectItem[]): IndexedObjectItem[] {
  const result = new Array<IndexedObjectItem>(objects.length);
  for (let i = 0; i < objects.length; i++) {
    result[i] = indexObject(objects[i]);
  }
  return result;
}

/**
 * Complete directory cache with all objects and subdirectories
 */
export interface DirectoryCache {
  objects: IndexedObjectItem[];
  directories: string[];
  totalObjects: number;
  totalDirectories: number;
  limited: boolean;
}

/**
 * Parameters for fetching all objects in a directory
 */
export interface FetchAllObjectsParams {
  bucket: string;
  prefix?: string;
  search?: string;
  compressed?: "true" | "false" | "any";
  bypassCache?: boolean;
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
  const { bucket, prefix, search, compressed, bypassCache, onProgress, onPreviewReady } = params;

  // Stage 1: Quick preview (first 100 items, no metadata)
  if (onPreviewReady) {
    if (DEBUG_CACHE)
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
      bypassCache,
    });

    if (DEBUG_CACHE) {
      console.log(
        `[objectsCache] Preview ready: ${previewResponse.objects.length} objects, ${previewResponse.common_prefixes.length} dirs`,
      );
    }

    // Provide quick preview to UI immediately (indexed for fast filter/sort)
    const indexedPreview = indexObjects(previewResponse.objects);
    onPreviewReady({
      objects: indexedPreview,
      directories: previewResponse.common_prefixes,
      totalObjects: indexedPreview.length,
      totalDirectories: previewResponse.common_prefixes.length,
      limited: previewResponse.limited ?? false,
    });
  }

  // Stage 2: Full data fetch (all items, with metadata)
  if (DEBUG_CACHE)
    console.log("[objectsCache] Stage 2: Fetching full data (all items, with metadata)");
  const allObjects: IndexedObjectItem[] = [];
  const allDirectories = new Set<string>();
  let cursor: string | undefined;
  let pageCount = 0;
  let isLimited = false;

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
      bypassCache: !cursor ? bypassCache : undefined, // Only bypass on first page
    });

    // Index each page as it arrives — pre-compute search/sort fields once
    const indexed = indexObjects(response.objects);
    allObjects.push(...indexed);
    response.common_prefixes.forEach((dir) => allDirectories.add(dir));

    // Check if any response indicates the listing was limited
    if (response.limited) {
      isLimited = true;
    }

    // Hard cap: stop fetching if we've reached the client-side limit
    if (allObjects.length >= MAX_CLIENT_OBJECTS) {
      isLimited = true;
      cursor = undefined;
      if (DEBUG_CACHE)
        console.log(
          `[objectsCache] Reached client cap (${MAX_CLIENT_OBJECTS}), stopping fetch`,
        );
    } else {
      cursor = response.cursor ?? undefined;
    }

    // Report progress
    if (onProgress) {
      onProgress(allObjects.length, undefined);
    }
    if (DEBUG_CACHE) {
      if (cursor) {
        console.log(
          `[objectsCache] Fetching page ${pageCount + 1}, loaded so far: ${allObjects.length}`,
        );
      } else {
        console.log(
          `[objectsCache] Full fetch complete: ${allObjects.length} objects total${isLimited ? " (TRUNCATED at 15K limit)" : ""}`,
        );
      }
    }
  } while (cursor);

  return {
    objects: allObjects,
    directories: Array.from(allDirectories),
    totalObjects: allObjects.length,
    totalDirectories: allDirectories.size,
    limited: isLimited,
  };
}

/**
 * Sorts an already-filtered array of indexed objects **in-place** and returns it.
 * Callers must pass a copy if the original must remain untouched.
 *
 * Uses pre-computed `_keyLower` / `_modifiedMs` and avoids `localeCompare`
 * for ~10x faster name comparisons on ASCII-dominated S3 keys.
 */
export function sortObjects(
  objects: IndexedObjectItem[],
  sortKey: ObjectSortKey,
  order: "asc" | "desc",
): IndexedObjectItem[] {
  const dir = order === "asc" ? 1 : -1;

  switch (sortKey) {
    case "name":
      objects.sort((a, b) => (a._keyLower < b._keyLower ? -dir : a._keyLower > b._keyLower ? dir : 0));
      break;
    case "size":
      objects.sort((a, b) => (a.original_bytes - b.original_bytes) * dir);
      break;
    case "modified":
      objects.sort((a, b) => (a._modifiedMs - b._modifiedMs) * dir);
      break;
  }

  return objects;
}

/**
 * Sorts a copy of directories array by name using fast ordinal comparison.
 */
export function sortDirectories(directories: string[], order: "asc" | "desc" = "asc"): string[] {
  const sorted = [...directories];
  const dir = order === "asc" ? 1 : -1;
  sorted.sort((a, b) => (a < b ? -dir : a > b ? dir : 0));
  return sorted;
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
