import { Folder } from "lucide-react";
import { SelectionTarget } from "../../useObjectSelection";
import { DirectoryCounts } from "../../useDirectoryCounts";
import { DirectoryCountsCell } from "../../DirectoryCountsCell";

interface DirectoryCardProps {
  prefix: string;
  label: string;
  counts: DirectoryCounts | undefined;
  isSelected: boolean;
  onToggleSelect: (target: SelectionTarget) => void;
  onEnterDirectory: (prefix: string) => void;
}

export function DirectoryCard({
  prefix,
  label,
  counts,
  isSelected,
  onToggleSelect,
  onEnterDirectory,
}: DirectoryCardProps) {
  const target: SelectionTarget = { type: "prefix", key: prefix };

  return (
    <div
      className={`rounded-lg border border-ui-border bg-ui-surface p-3 shadow-sm transition focus-within:ring-2 focus-within:ring-ui-border-hover dark:focus-within:ring-ui-border-hover-dark dark:border-ui-border-dark dark:bg-ui-surface-dark ${
        isSelected ? "ring-2 ring-ui-border-hover dark:ring-ui-border-hover-dark" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 flex-shrink-0 rounded border-ui-border-hover text-primary-600 focus:ring-primary-500 dark:border-ui-border-hover-dark"
          checked={isSelected}
          onChange={() => onToggleSelect(target)}
          aria-checked={isSelected}
          aria-label={`Select folder ${label}`}
        />
        <button
          type="button"
          onClick={() => onEnterDirectory(prefix)}
          className="flex flex-1 items-center justify-between rounded-md px-1 py-1 text-left transition hover:bg-ui-surface-hover/70 focus-visible:outline-focus focus-visible:outline-offset-0 focus-visible:outline-primary-600 dark:hover:bg-ui-surface-hover-dark/70"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-ui-surface-active text-ui-text-muted dark:bg-ui-surface-active-dark dark:text-ui-text-muted-dark">
              <Folder className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-ui-text dark:text-ui-text-dark">
              {label || "/"}
            </span>
          </span>
          <span className="text-xs text-ui-text-muted dark:text-ui-text-subtle">Open</span>
        </button>
      </div>
      <div className="mt-3 pl-8 text-xs text-ui-text-muted dark:text-ui-text-subtle">
        <DirectoryCountsCell counts={counts} />
      </div>
    </div>
  );
}
