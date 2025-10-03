import { useMemo } from "react";
import { useBuckets } from "../buckets/useBuckets";

export interface StatsSummary {
  bucketCount: number;
  objectCount: number;
  originalBytes: number;
  storedBytes: number;
  savingsPct: number;
  pendingCount: number;
}

export function useStats(targetBucket?: string) {
  const bucketsQuery = useBuckets();

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
    const objectCount = filtered.reduce((total, bucket) => total + bucket.object_count, 0);
    const originalBytes = filtered.reduce((total, bucket) => total + bucket.original_bytes, 0);
    const storedBytes = filtered.reduce((total, bucket) => total + bucket.stored_bytes, 0);
    const pendingCount = filtered.reduce((total, bucket) => total + (bucket.pending ? 1 : 0), 0);
    const savingsPct =
      originalBytes === 0 ? 0 : ((originalBytes - storedBytes) / originalBytes) * 100;
    return { bucketCount, objectCount, originalBytes, storedBytes, savingsPct, pendingCount };
  }, [bucketsQuery.data, targetBucket]);

  return {
    summary,
    isLoading: bucketsQuery.isLoading,
    isError: bucketsQuery.isError,
    error: bucketsQuery.error,
    refetch: bucketsQuery.refetch,
  };
}
