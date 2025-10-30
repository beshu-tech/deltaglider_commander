import { useMutation, useQueryClient } from "../../hooks/useAuthQuery";
import { triggerSavings } from "../../lib/api/endpoints";
import { qk } from "../../lib/api/queryKeys";
import { useToast } from "../../app/toast";

export function useSavings(bucket: string) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: () => triggerSavings(bucket),
    onSuccess: () => {
      toast.push({ title: "Savings job started", description: `Bucket ${bucket}`, level: "info" });
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
    },
    onError: (error) => {
      toast.push({
        title: "Could not trigger savings",
        description: String(error),
        level: "error",
      });
    },
  });
}
