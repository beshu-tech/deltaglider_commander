import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchObjects } from "../../../lib/api/endpoints";
import { qk } from "../../../lib/api/queryKeys";

/**
 * Hook to fetch existing folder paths in a bucket for autocomplete
 * Returns unique folder prefixes by extracting them from object keys
 */
export function useBucketPaths(bucket: string) {
  const { data: objectsData } = useQuery({
    queryKey: qk.objects(bucket, "", "name", "asc", 1000, "any"),
    queryFn: () => fetchObjects({ bucket, prefix: "", limit: 1000, sort: "name", order: "asc" }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const paths = useMemo(() => {
    if (!objectsData) {
      console.log("[useBucketPaths] No data yet");
      return [];
    }

    console.log(
      "[useBucketPaths] Processing",
      objectsData.objects?.length || 0,
      "objects and",
      objectsData.common_prefixes?.length || 0,
      "common prefixes",
    );

    const pathSet = new Set<string>();

    // Add common prefixes (top-level folders) directly
    if (objectsData.common_prefixes) {
      objectsData.common_prefixes.forEach((prefix) => {
        // Remove trailing slash if present
        const cleanPrefix = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
        if (cleanPrefix) {
          pathSet.add(cleanPrefix);
        }
      });
    }

    // Extract folder paths from object keys
    if (objectsData.objects) {
      objectsData.objects.forEach((item) => {
        const key = item.key;
        const segments = key.split("/");

        // Extract all folder prefixes from the key
        // For example, "build/1.67.0/universal/file.txt" generates:
        // - "build"
        // - "build/1.67.0"
        // - "build/1.67.0/universal"
        for (let i = 1; i < segments.length; i++) {
          const prefix = segments.slice(0, i).join("/");
          if (prefix) {
            pathSet.add(prefix);
          }
        }
      });
    }

    // Convert to array and sort
    const result = Array.from(pathSet).sort();
    console.log("[useBucketPaths] Extracted paths:", result);
    return result;
  }, [objectsData]);

  return paths;
}
