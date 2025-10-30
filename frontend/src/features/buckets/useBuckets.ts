import { useAuthQuery } from "../../hooks/useAuthQuery";
import { fetchBuckets } from "../../lib/api/endpoints";
import { qk } from "../../lib/api/queryKeys";
import { Bucket } from "./types";

interface UseBucketsOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
}

export function useBuckets(options?: UseBucketsOptions) {
  return useAuthQuery<Bucket[]>({
    queryKey: qk.buckets,
    queryFn: fetchBuckets,
    staleTime: 30_000,
    ...options,
  });
}
