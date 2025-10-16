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
      <span className="flex flex-col text-sm">
        <span className="font-medium text-ui-text dark:text-ui-text-dark">
          {formatBytes(effectiveSize)}
        </span>
        <span className="text-xs text-ui-text-subtle line-through">{formatBytes(originalBytes)}</span>
      </span>
    );
  }

  // Always show original_bytes (available immediately)
  return <span className="font-medium">{formatBytes(originalBytes)}</span>;
}
