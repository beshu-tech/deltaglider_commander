import { useQuery } from "@tanstack/react-query";
import { fetchBuckets } from "../../lib/api/endpoints";
import { qk } from "../../lib/api/queryKeys";
import { getPollMs } from "../../lib/config/env";
import { Bucket } from "./types";

export function useBuckets() {
  return useQuery<Bucket[]>({
    queryKey: qk.buckets,
    queryFn: fetchBuckets,
    staleTime: 30_000,
    refetchInterval: getPollMs()
  });
}
