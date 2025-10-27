import { AlertTriangle, FileText } from "lucide-react";
import { formatBytes } from "../../../../lib/utils/bytes";
import { formatDateTime } from "../../../../lib/utils/dates";
import { ObjectItem } from "../../types";
import { SelectionTarget } from "../../useObjectSelection";
import { useCompressionStats } from "../../hooks/useCompressionStats";

interface ObjectCardProps {
  item: ObjectItem;
  isSelected: boolean;
  isActive: boolean;
  onToggleSelect: (target: SelectionTarget) => void;
  onRowClick: (item: ObjectItem) => void;
}

export function ObjectCard({
  item,
  isSelected,
  isActive,
  onToggleSelect,
  onRowClick,
}: ObjectCardProps) {
  const target: SelectionTarget = { type: "object", key: item.key };
  const name = item.key.includes("/") ? (item.key.split("/").pop() ?? item.key) : item.key;
  const storedSize = formatBytes(item.stored_bytes);
  const originalSize = formatBytes(item.original_bytes);
  const compression = useCompressionStats(item);

  return (
    <div
      className={`rounded-lg border border-ui-border bg-ui-surface p-3 shadow-sm transition dark:border-ui-border-dark dark:bg-ui-surface-dark ${
        isSelected ? "ring-2 ring-ui-border-hover dark:ring-ui-border-hover-dark" : ""
      } ${isActive ? "border-ui-border-hover dark:border-ui-border-hover-dark" : ""}`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 flex-shrink-0 rounded border-ui-border-hover text-primary-600 focus:ring-primary-500 dark:border-ui-border-hover-dark"
          checked={isSelected}
          onChange={() => onToggleSelect(target)}
          aria-checked={isSelected}
          aria-label={`Select object ${name}`}
        />
        <button
          type="button"
          onClick={() => onRowClick(item)}
          className="flex flex-1 flex-col rounded-md px-1 py-1 text-left transition hover:bg-ui-surface-hover/70 focus-visible:outline-focus focus-visible:outline-offset-0 focus-visible:outline-primary-600 dark:hover:bg-ui-surface-hover-dark/70"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-ui-surface-active text-ui-text-muted dark:bg-ui-surface-active-dark dark:text-ui-text-muted-dark">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="max-w-[14rem] truncate text-sm font-semibold text-ui-text dark:text-ui-text-dark">
                {name}
              </span>
            </span>
            <span className="text-xs font-medium uppercase tracking-wide text-ui-text-muted dark:text-ui-text-subtle">
              {formatDateTime(item.modified)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ui-text-muted dark:text-ui-text-subtle">
            <span className="font-semibold text-ui-text dark:text-ui-text-dark">{storedSize}</span>
            {compression.variant !== "none" ? (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                  compression.variant === "savings"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                    : "bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200"
                }`}
              >
                {compression.variant === "savings" ? "Saved" : "Growth"}{" "}
                {compression.percentage.toFixed(1)}%
              </span>
            ) : null}
            {compression.variant === "savings" ? (
              <span className="text-ui-text-subtle line-through dark:text-ui-text-muted">
                {originalSize}
              </span>
            ) : null}
            {compression.variant === "growth" ? (
              <span className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-300">
                <AlertTriangle className="h-3 w-3" />
                Larger delta
              </span>
            ) : null}
          </div>
        </button>
      </div>
    </div>
  );
}
