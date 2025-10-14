import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { qk } from "../../lib/api/queryKeys";
import { ObjectItem, ObjectSortKey } from "./types";
import {
  fetchAllObjects,
  sortObjects,
  sortDirectories,
  calculatePaginationInfo,
  DirectoryCache,
} from "./objectsCache";
import { loadFromLocalStorage, saveToLocalStorage } from "../../lib/cache/localStorage";
import { useDirectoryCounts, DirectoryCounts } from "./useDirectoryCounts";

/**
 * Options for the cached objects hook
 */
export interface UseObjectsCacheOptions {
  bucket: string;
  prefix?: string;
  search?: string;
  compressed?: "true" | "false" | "any";
  sort: ObjectSortKey;
  order: "asc" | "desc";
  pageIndex: number;
  pageSize: number;
}

/**
 * Result from the cached objects hook
 */
export interface UseObjectsCacheResult {
  // Data
  objects: ObjectItem[];
  directories: string[];
  totalObjects: number;
  totalDirectories: number;
  totalItems: number;

  // Pagination
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  pageIndex: number;

  // Query state
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  isLoadingFull: boolean; // True when loading full data after preview
  error: Error | null;
  refetch: () => void;

  // Progress (during initial fetch)
  fetchProgress?: {
    loaded: number;
    total: number | undefined;
  };

  // Directory file counts (Stage 3 loading)
  directoryFileCounts: Map<string, DirectoryCounts>;
  isLoadingCounts: boolean;

  // Utility function to count direct files in a subdirectory (deprecated, use directoryFileCounts)
  getDirectoryFileCount: (directoryPrefix: string) => number;
}

/**
 * Hook that fetches and caches all objects in a directory for client-side sorting and pagination.
 *
 * This hook replaces useObjects for better performance when sorting. It:
 * 1. Fetches ALL pages on initial load (uses cursor pagination internally)
 * 2. Caches the complete dataset in TanStack Query
 * 3. Performs sorting and pagination client-side (instant, no network requests)
 * 4. Automatically invalidates cache when needed
 *
 * @param options - Hook options including bucket, prefix, sort, pagination
 * @returns Paginated and sorted objects with query state
 */
export function useObjectsCache(options: UseObjectsCacheOptions): UseObjectsCacheResult {
  const { bucket, prefix = "", search, compressed, sort, order, pageIndex, pageSize } = options;

  const [fetchProgress, setFetchProgress] = useState<{
    loaded: number;
    total: number | undefined;
  }>();
  const [previewData, setPreviewData] = useState<DirectoryCache | null>(null);
  const [isLoadingFull, setIsLoadingFull] = useState(false);
  const skipLocalStorageRef = useRef(false);

  const queryKey = qk.objectsFull(bucket, prefix, undefined, "any");

  // Query for full directory cache (without search or compression filter - we'll filter client-side)
  const query = useQuery<DirectoryCache, Error>({
    queryKey,
    queryFn: async () => {
      setFetchProgress(undefined); // Reset progress
      setPreviewData(null); // Clear any previous preview
      setIsLoadingFull(false);

      // Try to load from localStorage first (unless skipLocalStorageRef is true)
      if (!skipLocalStorageRef.current) {
        const cached = loadFromLocalStorage<DirectoryCache>(queryKey);
        if (cached) {
          return cached;
        }
      }

      // Reset the flag for next query
      skipLocalStorageRef.current = false;

      // Fetch from network with two-stage loading
      const result = await fetchAllObjects({
        bucket,
        prefix,
        search: undefined, // Don't pass search to API, we'll filter client-side
        compressed: "any", // Fetch all objects, we'll filter client-side
        onProgress: (loaded, total) => {
          setFetchProgress({ loaded, total });
        },
        onPreviewReady: (preview) => {
          // Show preview immediately to user and mark as loading full data
          setPreviewData(preview);
          setIsLoadingFull(true);
        },
      });
      setFetchProgress(undefined); // Clear progress when done
      setIsLoadingFull(false);

      // Save to localStorage for future use
      saveToLocalStorage(queryKey, result);

      return result;
    },
    staleTime: 30_000, // Cache fresh for 30 seconds in memory
    gcTime: 5 * 60 * 1000, // Keep in memory cache for 5 minutes
  });

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (query.data) {
      saveToLocalStorage(queryKey, query.data);
    }
  }, [query.data, queryKey]);

  // Use preview data while full data is loading, otherwise use full data
  // Priority: full data > preview data > null
  const cache = query.data || previewData;

  // Filter objects by compression type (client-side)
  const compressionFilteredObjects = useMemo(() => {
    if (!cache) return [];
    if (!compressed || compressed === "any") return cache.objects;

    if (compressed === "true") {
      return cache.objects.filter((obj) => obj.compressed);
    } else if (compressed === "false") {
      return cache.objects.filter((obj) => !obj.compressed);
    }
    return cache.objects;
  }, [cache, compressed]);

  // Filter objects by search term (client-side)
  const filteredObjects = useMemo(() => {
    if (!search || search.trim() === "") return compressionFilteredObjects;

    const searchLower = search.toLowerCase();
    return compressionFilteredObjects.filter((obj) => obj.key.toLowerCase().includes(searchLower));
  }, [compressionFilteredObjects, search]);

  // Filter directories by search term (client-side)
  const filteredDirectories = useMemo(() => {
    if (!cache) return [];
    if (!search || search.trim() === "") return cache.directories;

    const searchLower = search.toLowerCase();
    return cache.directories.filter((dir) => dir.toLowerCase().includes(searchLower));
  }, [cache, search]);

  // Sort objects client-side
  const sortedObjects = useMemo(() => {
    return sortObjects(filteredObjects, sort, order);
  }, [filteredObjects, sort, order]);

  // Sort directories by name (directories don't have size/modified, so only name sorting applies)
  const sortedDirectories = useMemo(() => {
    // Only apply order when sorting by name, otherwise keep alphabetical
    const dirOrder = sort === "name" ? order : "asc";
    return sortDirectories(filteredDirectories, dirOrder);
  }, [filteredDirectories, sort, order]);

  // Stage 3: Progressive directory count fetching
  // Enable after we have directory names (from Stage 1 or cache)
  const directoryCounts = useDirectoryCounts({
    bucket,
    directories: sortedDirectories,
    enabled: sortedDirectories.length > 0 && !query.isLoading,
  });

  // Calculate total items for pagination (based on filtered results)
  const totalItems = sortedObjects.length + sortedDirectories.length;

  // Calculate pagination info
  const paginationInfo = useMemo(
    () => calculatePaginationInfo(totalItems, pageIndex, pageSize),
    [totalItems, pageIndex, pageSize],
  );

  // Paginate: directories first, then objects
  const { paginatedDirectories, paginatedObjects } = useMemo(() => {
    if (!cache) {
      return { paginatedDirectories: [], paginatedObjects: [] };
    }

    const startIndex = paginationInfo.startIndex;
    const endIndex = paginationInfo.endIndex;
    const dirCount = sortedDirectories.length;

    // If page starts before directories end, include directories
    let dirs: string[] = [];
    if (startIndex < dirCount) {
      const dirEnd = Math.min(endIndex, dirCount);
      dirs = sortedDirectories.slice(startIndex, dirEnd);
    }

    // If page extends into objects, include objects
    let objs: ObjectItem[] = [];
    if (endIndex > dirCount) {
      const objStart = Math.max(0, startIndex - dirCount);
      const objEnd = endIndex - dirCount;
      objs = sortedObjects.slice(objStart, objEnd);
    }

    return {
      paginatedDirectories: dirs,
      paginatedObjects: objs,
    };
  }, [cache, sortedDirectories, sortedObjects, paginationInfo]);

  // Custom refetch that bypasses localStorage
  const refetch = () => {
    skipLocalStorageRef.current = true;
    return query.refetch();
  };

  // Function to count direct files in a subdirectory
  // Counts only files directly in the subdirectory, not in nested folders
  const getDirectoryFileCount = (directoryPrefix: string): number => {
    if (!cache) return 0;

    // Ensure the prefix ends with /
    const normalizedPrefix = directoryPrefix.endsWith("/")
      ? directoryPrefix
      : `${directoryPrefix}/`;

    // Count objects that start with this prefix
    // but don't contain another / after the prefix (direct files only)
    return cache.objects.filter((obj) => {
      if (!obj.key.startsWith(normalizedPrefix)) return false;

      // Get the part after the prefix
      const remainder = obj.key.substring(normalizedPrefix.length);

      // If there's no /, it's a direct file in this directory
      return !remainder.includes("/");
    }).length;
  };

  return {
    // Data
    objects: paginatedObjects,
    directories: paginatedDirectories,
    totalObjects: sortedObjects.length, // Filtered count
    totalDirectories: sortedDirectories.length, // Filtered count
    totalItems,

    // Pagination
    currentPage: paginationInfo.currentPage,
    totalPages: paginationInfo.totalPages,
    hasNextPage: paginationInfo.hasNextPage,
    hasPreviousPage: paginationInfo.hasPreviousPage,
    pageIndex,

    // Query state
    isLoading: query.isLoading,
    isError: query.isError,
    isFetching: query.isFetching,
    isLoadingFull,
    error: query.error,
    refetch,

    // Progress
    fetchProgress,

    // Directory counts (Stage 3)
    directoryFileCounts: directoryCounts.counts,
    isLoadingCounts: directoryCounts.isLoading,

    // Utilities
    getDirectoryFileCount,
  };
}
