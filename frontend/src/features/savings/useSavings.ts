import { useMutation, useQueryClient } from "@tanstack/react-query";
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
    },
    onError: (error) => {
      toast.push({ title: "Could not trigger savings", description: String(error), level: "error" });
    }
  });
}
