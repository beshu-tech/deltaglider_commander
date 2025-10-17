import { AlertTriangle, Loader2 } from "lucide-react";
import { Tooltip } from "../../../../lib/ui/Tooltip";
import { CompressionStats, ObjectItem } from "../../types";
import { formatBytes } from "../../../../lib/utils/bytes";

interface CompressionBadgeProps {
  compressionStats: CompressionStats;
  item: ObjectItem;
  isLoading?: boolean;
}

export function CompressionBadge({
  compressionStats,
  item,
  isLoading = false,
}: CompressionBadgeProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-ui-text-subtle" />
      </div>
    );
  }

  const { variant, percentage } = compressionStats;

  if (!item.compressed || variant === "none") {
    return (
      <span className="inline-flex items-center rounded-full bg-ui-surface-active px-2 py-1 text-xs font-medium text-ui-text dark:bg-ui-surface-active-dark dark:text-ui-text-muted-dark">
        Original
      </span>
    );
  }

  if (variant === "growth") {
    const original = formatBytes(item.original_bytes);
    const stored = formatBytes(item.stored_bytes);
    return (
      <Tooltip
        label={`Delta compression increased this object. The stored delta (${stored}) is larger than the original (${original}). This typically happens when the reference no longer matches closely or the source is already compressed. Re-upload without delta compression or refresh the reference to recover savings.`}
      >
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-800 dark:bg-rose-900 dark:text-rose-200">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          Growth {percentage.toFixed(1)}%
        </span>
      </Tooltip>
    );
  }

  // Color coding based on compression percentage
  const getCompressionColor = (pct: number) => {
    if (pct >= 70)
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
    if (pct >= 40)
      return "bg-ui-surface-active text-ui-text-muted dark:bg-ui-surface-active-dark dark:text-ui-text-muted-dark";
    return "bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200";
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getCompressionColor(percentage)}`}
    >
      {percentage.toFixed(1)}%
    </span>
  );
}
