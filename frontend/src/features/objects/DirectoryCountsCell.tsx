import { DirectoryCounts } from "./useDirectoryCounts";

interface DirectoryCountsCellProps {
  counts: DirectoryCounts | undefined;
}

/**
 * Compact two-line display component for directory file and folder counts.
 * Designed for use in the Size column of the objects table.
 *
 * @example
 * <DirectoryCountsCell counts={{ files: 95, folders: 5, hasMore: true }} />
 * // Renders:
 * // 95+ files
 * // 5+ folders
 */
export function DirectoryCountsCell({ counts }: DirectoryCountsCellProps) {
  // Loading state - show subtle loading indicator
  if (counts === undefined) {
    return (
      <div className="flex flex-col gap-0.5 text-xs">
        <div className="text-slate-400 dark:text-slate-500">...</div>
      </div>
    );
  }

  // Empty directory - show em dash
  if (counts.files === 0 && counts.folders === 0) {
    return <div className="text-slate-400 dark:text-slate-500">—</div>;
  }

  const suffix = counts.hasMore ? "+" : "";

  return (
    <div className="flex flex-col gap-0.5 text-xs leading-tight">
      {/* Files count - show if non-zero */}
      {counts.files > 0 && (
        <div className="text-slate-600 dark:text-slate-400">
          <span className="font-medium tabular-nums">
            {counts.files}
            {suffix}
          </span>
          <span className="ml-1 text-slate-500 dark:text-slate-500">
            {counts.files === 1 ? "file" : "files"}
          </span>
        </div>
      )}

      {/* Folders count - show if non-zero */}
      {counts.folders > 0 && (
        <div className="text-slate-600 dark:text-slate-400">
          <span className="font-medium tabular-nums">
            {counts.folders}
            {suffix}
          </span>
          <span className="ml-1 text-slate-500 dark:text-slate-500">
            {counts.folders === 1 ? "folder" : "folders"}
          </span>
        </div>
      )}
    </div>
  );
}
