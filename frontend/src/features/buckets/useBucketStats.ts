import { useQuery } from "@tanstack/react-query";
import { fetchBucketStats, BucketStatsMode } from "../../lib/api/endpoints";
import { qk } from "../../lib/api/queryKeys";
import { Bucket } from "./types";

export function useBucketStats(bucket: Bucket, mode: BucketStatsMode = "sampled") {
  return useQuery({
    queryKey: qk.bucketStats(bucket.name, mode),
    queryFn: () => fetchBucketStats(bucket.name, mode),
    placeholderData: () => bucket,
    staleTime: 60_000,
  });
}
