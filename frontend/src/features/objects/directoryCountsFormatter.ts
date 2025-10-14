import { DirectoryCounts } from "./useDirectoryCounts";

/**
 * Formats directory counts for display in the Size column.
 *
 * @param counts - The directory counts object, or undefined if still loading
 * @returns Formatted string like "5 files, 2 folders" or "95+ files, 5+ folders"
 *
 * @example
 * formatDirectoryCounts({ files: 5, folders: 2, hasMore: false })
 * // Returns: "5 files, 2 folders"
 *
 * @example
 * formatDirectoryCounts({ files: 95, folders: 5, hasMore: true })
 * // Returns: "95+ files, 5+ folders"
 *
 * @example
 * formatDirectoryCounts({ files: 0, folders: 0, hasMore: false })
 * // Returns: "—"
 *
 * @example
 * formatDirectoryCounts(undefined)
 * // Returns: "..." (loading indicator)
 */
export function formatDirectoryCounts(counts: DirectoryCounts | undefined): string {
  // Show loading indicator while fetching
  if (counts === undefined) {
    return "...";
  }

  const parts: string[] = [];

  // Add file count if non-zero
  if (counts.files > 0) {
    const suffix = counts.hasMore ? "+" : "";
    const label = counts.files === 1 ? "file" : "files";
    parts.push(`${counts.files}${suffix} ${label}`);
  }

  // Add folder count if non-zero
  if (counts.folders > 0) {
    const suffix = counts.hasMore ? "+" : "";
    const label = counts.folders === 1 ? "folder" : "folders";
    parts.push(`${counts.folders}${suffix} ${label}`);
  }

  // If both are zero or empty, show em dash
  return parts.length > 0 ? parts.join(", ") : "—";
}
