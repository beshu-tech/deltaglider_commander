import { formatBytes } from "../../../../lib/utils/bytes";
import { CompressionStats } from "../../types";

interface ObjectSizeCellProps {
  originalBytes: number;
  compressionStats: CompressionStats;
  isCompressed: boolean;
  isLoadingMetadata?: boolean;
}

export function ObjectSizeCell({
  originalBytes,
  compressionStats,
  isCompressed,
  isLoadingMetadata = false,
}: ObjectSizeCellProps) {
  const { effectiveSize } = compressionStats;

  // Show compressed size with strikethrough original when metadata is loaded
  if (!isLoadingMetadata && isCompressed && originalBytes !== effectiveSize) {
    return (
      <div className="text-xs leading-tight whitespace-nowrap">
        <span className="font-medium text-ui-text dark:text-ui-text-dark">
          {formatBytes(effectiveSize)}
        </span>
        <span className="ml-1 text-[10px] text-ui-text-subtle line-through opacity-75 dark:opacity-70">
          {formatBytes(originalBytes)}
        </span>
      </div>
    );
  }

  // Always show original_bytes (available immediately)
  return <div className="text-xs leading-tight font-medium">{formatBytes(originalBytes)}</div>;
}
