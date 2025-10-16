import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../app/toast";
import { refreshBucketStats, BucketStatsMode } from "../../lib/api/endpoints";
import { qk } from "../../lib/api/queryKeys";

export function useRefreshBucketStats(defaultMode: BucketStatsMode = "sampled") {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (mode: BucketStatsMode = defaultMode) => refreshBucketStats(mode),
    onSuccess: (_data, variables) => {
      const modeLabel = variables ?? defaultMode;
      toast.push({
        title: "Bucket stats refreshed",
        description: `Mode: ${modeLabel}`,
        level: "success",
      });
      void queryClient.invalidateQueries({ queryKey: qk.buckets });
      void queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "bucket-stats",
      });
      void queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "stats",
      });
    },
    onError: (error) => {
      toast.push({
        title: "Could not refresh bucket stats",
        description: String(error),
        level: "error",
      });
    },
  });
}
