import { useEffect, useRef, useState } from "react";
import { useAuthQuery as useQueryClient } from "../../hooks/useAuthQuery";
import { qk } from "../../lib/api/queryKeys";
import { fetchObjects } from "../../lib/api/endpoints";

/**
 * Result type for directory count queries
 *
 * @property files - Actual number of files found (up to limit)
 * @property folders - Actual number of folders found (up to limit)
 * @property hasMore - Whether more items exist beyond the fetched limit
 */
export interface DirectoryCounts {
  files: number;
  folders: number;
  hasMore: boolean;
}

/**
 * Options for the directory counts hook
 */
export interface UseDirectoryCountsOptions {
  bucket: string;
  directories: string[];
  enabled?: boolean;
  maxDirectories?: number;
  delayMs?: number;
}

/**
 * Result from the directory counts hook
 */
export interface UseDirectoryCountsResult {
  counts: Map<string, DirectoryCounts>;
  isLoading: boolean;
  loadedCount: number;
  totalCount: number;
}

/**
 * Hook that progressively fetches file and folder counts for subdirectories.
 *
 * This hook implements Stage 3 of the three-stage loading architecture:
 * - Fetches first 100 items from each subdirectory (without metadata)
 * - Counts files and folders separately
 * - Sequential requests with configurable delay to respect backend
 * - Caches results in TanStack Query for reuse
 * - Returns "100+" if cursor indicates more items exist
 *
 * @param options - Hook options
 * @returns Directory counts map and loading state
 */
export function useDirectoryCounts(options: UseDirectoryCountsOptions): UseDirectoryCountsResult {
  const { bucket, directories, enabled = true, maxDirectories = 50, delayMs = 100 } = options;

  const queryClient = useQueryClient();
  const [counts, setCounts] = useState<Map<string, DirectoryCounts>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Reset state when directories change
    setCounts(new Map());
    setLoadedCount(0);

    if (!enabled || directories.length === 0) {
      setIsLoading(false);
      return;
    }

    // Limit the number of directories to fetch
    const dirsToFetch = directories.slice(0, maxDirectories);

    // Create abort controller for cleanup
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Start fetching counts
    setIsLoading(true);

    const fetchCounts = async () => {
      let loaded = 0;

      for (const dir of dirsToFetch) {
        // Check if request was aborted
        if (abortController.signal.aborted) {
          break;
        }

        try {
          // Check cache first
          const queryKey = qk.directoryCount(bucket, dir);
          const cachedCounts = queryClient.getQueryData<DirectoryCounts>(queryKey);

          if (cachedCounts !== undefined) {
            // Use cached value
            setCounts((prev) => new Map(prev).set(dir, cachedCounts));
            loaded++;
            setLoadedCount(loaded);
            continue;
          }

          // Add delay between requests to be nice to backend
          if (loaded > 0) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }

          // Fetch first 100 items without metadata (fast)
          const response = await fetchObjects({
            bucket,
            prefix: dir,
            limit: 100,
            fetchMetadata: false,
            sort: "name",
            order: "asc",
          });

          // Count files and folders separately
          // Files are in the objects array, folders are in common_prefixes
          const fileCount = response.objects.length;
          const folderCount = response.common_prefixes.length;

          // Build counts object with actual counts and hasMore flag
          const counts: DirectoryCounts = {
            files: fileCount,
            folders: folderCount,
            hasMore: !!response.cursor, // Cursor indicates more items exist
          };

          // Cache the result
          queryClient.setQueryData(queryKey, counts);

          // Update state
          setCounts((prev) => new Map(prev).set(dir, counts));
          loaded++;
          setLoadedCount(loaded);
        } catch (error) {
          // Silently fail for individual directories
          console.warn(`Failed to fetch count for ${dir}:`, error);
          // Continue to next directory
        }
      }

      setIsLoading(false);
    };

    fetchCounts();

    // Cleanup function
    return () => {
      abortController.abort();
      setIsLoading(false);
    };
  }, [bucket, directories, enabled, maxDirectories, delayMs, queryClient]);

  return {
    counts,
    isLoading,
    loadedCount,
    totalCount: Math.min(directories.length, maxDirectories),
  };
}
