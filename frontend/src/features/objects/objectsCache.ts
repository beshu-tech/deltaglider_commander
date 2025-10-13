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
}

/**
 * Fetches all objects in a directory by iterating through all cursor-based pages.
 * This allows us to cache the complete dataset for client-side sorting and pagination.
 *
 * @param params - Fetch parameters
 * @returns Complete directory cache with all objects and directories
 */
export async function fetchAllObjects(params: FetchAllObjectsParams): Promise<DirectoryCache> {
  const { bucket, prefix, search, compressed, onProgress } = params;
  const allObjects: ObjectItem[] = [];
  const allDirectories = new Set<string>();
  let cursor: string | undefined;

  do {
    const response = await fetchObjects({
      bucket,
      prefix,
      search,
      cursor,
      limit: 500, // Use larger limit for efficiency
      sort: "name",
      order: "asc",
      compressed,
    });

    allObjects.push(...response.objects);
    response.common_prefixes.forEach((dir) => allDirectories.add(dir));

    // Report progress if callback provided
    if (onProgress) {
      // We don't know total until we finish, so pass undefined
      onProgress(allObjects.length, undefined);
    }

    cursor = response.cursor ?? undefined;
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
 * Sorts directories array alphabetically.
 * Directories are always sorted by name ascending.
 *
 * @param directories - Array of directory prefixes to sort
 * @returns Sorted array (new array, does not mutate input)
 */
export function sortDirectories(directories: string[]): string[] {
  return [...directories].sort((a, b) => a.localeCompare(b));
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
