import { useMemo } from "react";

export interface SavingsData {
  bytes: number;
  pct: number;
  isGrowth: boolean;
}

interface SavingsMetadata {
  original_bytes: number;
  stored_bytes: number;
}

export function useSavingsCalculation(metadata: SavingsMetadata | undefined): SavingsData {
  return useMemo(() => {
    if (!metadata) return { bytes: 0, pct: 0, isGrowth: false };

    const diff = metadata.original_bytes - metadata.stored_bytes;
    const absBytes = Math.abs(diff);
    const pct = metadata.original_bytes === 0 ? 0 : (absBytes / metadata.original_bytes) * 100;

    return { bytes: absBytes, pct, isGrowth: diff < 0 };
  }, [metadata]);
}
