import { useEffect, useMemo, useState } from "react";
import { useAuthQuery as useQueryClient } from "../../hooks/useAuthQuery";
import { useBuckets } from "../buckets/useBuckets";
import { qk } from "../../lib/api/queryKeys";
import { Bucket } from "../buckets/types";

export interface StatsSummary {
  bucketCount: number;
  objectCount: number;
  originalBytes: number;
  storedBytes: number;
  savingsPct: number;
  pendingCount: number;
  analyzedBucketCount: number;
  analyzingCount: number;
  analysisCoverage: number;
  activeBucketCount: number;
  analyzedObjectCount: number;
  analyzedOriginalBytes: number;
  analyzedStoredBytes: number;
}

export function useStats(targetBucket?: string) {
  const bucketsQuery = useBuckets();
  const queryClient = useQueryClient();
  const [statsByBucket, setStatsByBucket] = useState<
    Record<string, { data: Bucket; dataUpdatedAt: number }>
  >({});

  useEffect(() => {
    if (!bucketsQuery.data || bucketsQuery.data.length === 0) {
      setStatsByBucket({});
      return;
    }

    const updateCache = () => {
      if (!bucketsQuery.data) {
        return;
      }

      setStatsByBucket((prev) => {
        const next: Record<string, { data: Bucket; dataUpdatedAt: number }> = {};
        for (const bucket of bucketsQuery.data) {
          const state = queryClient.getQueryState<Bucket>(qk.bucketStats(bucket.name, "sampled"));
          if (state?.data) {
            next[bucket.name] = { data: state.data, dataUpdatedAt: state.dataUpdatedAt ?? 0 };
          }
        }
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);
        if (prevKeys.length !== nextKeys.length) {
          return next;
        }
        const hasDifference = nextKeys.some((key) => {
          const prevEntry = prev[key];
          const nextEntry = next[key];
          if (!prevEntry || !nextEntry) {
            return true;
          }
          return (
            prevEntry.data !== nextEntry.data || prevEntry.dataUpdatedAt !== nextEntry.dataUpdatedAt
          );
        });
        return hasDifference ? next : prev;
      });
    };

    updateCache();

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      const queryKey = event?.query?.queryKey;
      if (!queryKey || queryKey[0] !== "bucket-stats") {
        return;
      }
      const bucketName = queryKey[1];
      if (
        typeof bucketName === "string" &&
        bucketsQuery.data?.some((bucket) => bucket.name === bucketName)
      ) {
        updateCache();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [bucketsQuery.data, queryClient]);

  const summary = useMemo<StatsSummary | null>(() => {
    const data = bucketsQuery.data;
    if (!data || data.length === 0) {
      return null;
    }
    const filtered = targetBucket ? data.filter((bucket) => bucket.name === targetBucket) : data;
    if (filtered.length === 0) {
      return null;
    }
    const bucketCount = filtered.length;
    let totalObjectCount = 0;
    let totalOriginalBytes = 0;
    let totalStoredBytes = 0;
    let pendingCount = 0;
    let analyzedBucketCount = 0;
    let analyzingCount = 0;
    let analyzedObjectCount = 0;
    let analyzedOriginalBytes = 0;
    let analyzedStoredBytes = 0;

    for (const bucket of filtered) {
      const cachedEntry = statsByBucket[bucket.name];
      const cached = cachedEntry?.data;
      const stats = cached ? { ...bucket, ...cached } : bucket;
      const pending = Boolean(stats.pending);
      const dataUpdatedAt = cachedEntry?.dataUpdatedAt ?? 0;
      const statsLoaded = dataUpdatedAt > 0 || Boolean(stats.stats_loaded);

      if (pending) {
        pendingCount += 1;
      } else if (statsLoaded) {
        analyzedBucketCount += 1;
      } else {
        analyzingCount += 1;
      }

      totalObjectCount += stats.object_count;
      totalOriginalBytes += stats.original_bytes;
      totalStoredBytes += stats.stored_bytes;

      if (!pending && statsLoaded) {
        analyzedObjectCount += stats.object_count;
        analyzedOriginalBytes += stats.original_bytes;
        analyzedStoredBytes += stats.stored_bytes;
      }
    }

    const activeBucketCount = Math.max(bucketCount - pendingCount, 0);
    const analysisCoverage = activeBucketCount === 0 ? 0 : analyzedBucketCount / activeBucketCount;

    const effectiveObjectCount = analyzedBucketCount > 0 ? analyzedObjectCount : totalObjectCount;
    const effectiveOriginalBytes =
      analyzedBucketCount > 0 ? analyzedOriginalBytes : totalOriginalBytes;
    const effectiveStoredBytes = analyzedBucketCount > 0 ? analyzedStoredBytes : totalStoredBytes;

    const savingsPct =
      effectiveOriginalBytes === 0
        ? 0
        : ((effectiveOriginalBytes - effectiveStoredBytes) / effectiveOriginalBytes) * 100;

    return {
      bucketCount,
      objectCount: effectiveObjectCount,
      originalBytes: effectiveOriginalBytes,
      storedBytes: effectiveStoredBytes,
      savingsPct,
      pendingCount,
      analyzedBucketCount,
      analyzingCount,
      analysisCoverage,
      activeBucketCount,
      analyzedObjectCount,
      analyzedOriginalBytes,
      analyzedStoredBytes,
    };
  }, [bucketsQuery.data, targetBucket, statsByBucket]);

  return {
    summary,
    isLoading: bucketsQuery.isLoading,
    isError: bucketsQuery.isError,
    error: bucketsQuery.error,
    refetch: bucketsQuery.refetch,
  };
}
