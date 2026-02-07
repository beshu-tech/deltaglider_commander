import { Loader2 } from "lucide-react";

interface ObjectsStatusBarProps {
  isFetching: boolean;
  isLoadingMetadata: boolean;
  isLoadingCounts: boolean;
  fetchProgress?: { loaded: number; total: number | undefined };
}

export function ObjectsStatusBar({
  isFetching,
  isLoadingMetadata,
  isLoadingCounts,
  fetchProgress,
}: ObjectsStatusBarProps) {
  // Determine which stage to display (priority: metadata > refresh > counts)
  let label: string | null = null;

  if (isLoadingMetadata && fetchProgress) {
    const totalLabel = fetchProgress.total
      ? ` of ${fetchProgress.total.toLocaleString()}`
      : "";
    label = `Syncing metadata\u2026 ${fetchProgress.loaded.toLocaleString()}${totalLabel} objects`;
  } else if (isLoadingMetadata) {
    label = "Syncing metadata\u2026";
  } else if (isFetching) {
    label = "Refreshing file list\u2026";
  } else if (isLoadingCounts) {
    label = "Loading folder sizes\u2026";
  }

  if (!label) {
    // Nothing loading — render the same height spacer as before
    return <div className="h-3" />;
  }

  return (
    <div className="relative flex items-center gap-2 px-5 py-2">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-600 dark:text-primary-400" />
      <span className="text-xs font-medium text-ui-text-muted dark:text-ui-text-muted-dark">
        {label}
      </span>
      {/* Thin animated progress bar at the bottom */}
      <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-ui-border/30 dark:bg-ui-border-dark/30">
        <div className="h-full w-1/3 animate-shimmer bg-primary-500/60 dark:bg-primary-400/60" />
      </div>
    </div>
  );
}
