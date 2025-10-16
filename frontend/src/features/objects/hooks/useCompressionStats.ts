import { ObjectItem, CompressionStats } from "../types";

export function useCompressionStats(item: ObjectItem): CompressionStats {
  if (!item.compressed || item.original_bytes === 0) {
    return {
      variant: "none",
      percentage: 0,
      effectiveSize: item.original_bytes,
      deltaBytes: 0,
    };
  }

  const diff = item.original_bytes - item.stored_bytes;
  const deltaBytes = Math.abs(diff);
  const percentage = (deltaBytes / item.original_bytes) * 100;

  return {
    variant: diff >= 0 ? "savings" : "growth",
    percentage,
    effectiveSize: item.stored_bytes,
    deltaBytes,
  };
}
