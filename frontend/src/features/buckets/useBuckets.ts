import { useQuery } from "@tanstack/react-query";
import { fetchBuckets } from "../../lib/api/endpoints";
import { qk } from "../../lib/api/queryKeys";
import { getPollMs } from "../../lib/config/env";
import { Bucket } from "./types";

interface UseBucketsOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
}

export function useBuckets(options?: UseBucketsOptions) {
  return useQuery<Bucket[]>({
    queryKey: qk.buckets,
    queryFn: fetchBuckets,
    staleTime: 30_000,
    refetchInterval:
      options && "refetchInterval" in options && options.refetchInterval !== undefined
        ? options.refetchInterval
        : getPollMs(),
    enabled: options?.enabled ?? true,
  });
}
