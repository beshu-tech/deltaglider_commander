import { useQueryClient } from "@tanstack/react-query";
import { useAuthQuery as useQuery } from "../../hooks/useAuthQuery";
import { fetchObjectMetadata } from "../../lib/api/endpoints";
import { ApiError } from "../../lib/api/client";

export function useFile(bucket: string | null, key: string | null) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["meta", bucket, key] as const,
    queryFn: () => fetchObjectMetadata(bucket as string, key as string),
    enabled: Boolean(bucket && key),
    staleTime: 300_000,
    retry: (failureCount, error) => {
      // Don't retry on 404 - the file doesn't exist
      if (error instanceof ApiError && error.status === 404) {
        // Invalidate objects list to refresh and show accurate state
        if (bucket) {
          void queryClient.invalidateQueries({
            predicate: (query) =>
              Array.isArray(query.queryKey) &&
              (query.queryKey[0] === "objects" || query.queryKey[0] === "objects-full") &&
              query.queryKey[1] === bucket,
          });
        }
        return false;
      }
      // Default retry logic for other errors
      return failureCount < 3;
    },
  });
}
