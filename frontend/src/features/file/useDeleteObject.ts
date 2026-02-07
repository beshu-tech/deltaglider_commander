import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../app/toast";
import { deleteObject } from "../../lib/api/endpoints";
import { qk } from "../../lib/api/queryKeys";

export function useDeleteObject(bucket: string | null) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (key: string) => {
      if (!bucket) {
        throw new Error("Bucket is required to delete an object");
      }
      return deleteObject(bucket, key);
    },
    onSuccess: (_data, key) => {
      toast.push({ title: "Object deleted", description: key, level: "success" });
      if (bucket) {
        // Invalidate TanStack Query cache (memory) for both old cursor-based and new full cache
        void queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            (query.queryKey[0] === "objects" || query.queryKey[0] === "objects-full") &&
            query.queryKey[1] === bucket,
        });
        // Invalidate metadata query instead of removing to prevent refetch of deleted object
        void queryClient.invalidateQueries({ queryKey: qk.metadata(bucket, key) });
        void queryClient.invalidateQueries({ queryKey: qk.buckets });
        void queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey[0] === "bucket-stats" &&
            query.queryKey[1] === bucket,
        });
        void queryClient.invalidateQueries({
          predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "stats",
        });
      }
    },
    onError: (error, key) => {
      toast.push({
        title: "Could not delete object",
        description: `${key}: ${String(error)}`,
        level: "error",
      });
    },
  });
}
