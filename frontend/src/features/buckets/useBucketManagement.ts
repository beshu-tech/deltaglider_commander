import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../app/toast";
import { createBucket, deleteBucket } from "../../lib/api/endpoints";
import { qk } from "../../lib/api/queryKeys";

export function useCreateBucket() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (name: string) => createBucket(name),
    onSuccess: (_data, name) => {
      toast.push({ title: "Bucket created", description: name, level: "success" });
      void queryClient.invalidateQueries({ queryKey: qk.buckets });
    },
    onError: (error) => {
      toast.push({ title: "Could not create bucket", description: String(error), level: "error" });
    }
  });
}

export function useDeleteBucket() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (name: string) => deleteBucket(name),
    onSuccess: (_data, name) => {
      toast.push({ title: "Bucket deleted", description: name, level: "success" });
      void queryClient.invalidateQueries({ queryKey: qk.buckets });
    },
    onError: (error) => {
      toast.push({ title: "Could not delete bucket", description: String(error), level: "error" });
    }
  });
}
