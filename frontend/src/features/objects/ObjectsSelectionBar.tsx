import { Download, Trash2 } from "lucide-react";
import { Badge } from "../../lib/ui/Badge";
import { Button } from "../../lib/ui/Button";

export interface ObjectsSelectionBarProps {
  totalSelected: number;
  pageSelected: number;
  isFetching: boolean;
  onClear: () => void;
  onBulkDownload: () => Promise<void> | void;
  onBulkDelete: () => void;
}

export function ObjectsSelectionBar({
  totalSelected,
  pageSelected,
  isFetching,
  onClear,
  onBulkDownload,
  onBulkDelete,
}: ObjectsSelectionBarProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-ui-border bg-ui-bg-subtle px-3 py-3 text-sm text-ui-text-muted dark:border-ui-border-dark dark:bg-ui-surface-active-dark dark:text-ui-text-dark sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-ui-text dark:text-ui-text-dark">
          {totalSelected}
        </span>
        <span>selected</span>
        <Badge className="bg-ui-border text-ui-text dark:bg-ui-surface-active-dark dark:text-ui-text-dark">
          {pageSelected} on this page
        </Badge>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium uppercase tracking-wide text-primary-600 transition hover:text-primary-500 dark:text-primary-500 dark:hover:text-primary-400"
        >
          Clear
        </button>
      </div>
      <div className="flex flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
        <Button
          variant="secondary"
          onClick={onBulkDownload}
          disabled={isFetching}
          className="w-full min-w-[140px] sm:w-auto"
        >
          <Download className="h-4 w-4" />
          Download
        </Button>
        <Button
          variant="ghost"
          onClick={onBulkDelete}
          className="w-full text-red-600 hover:bg-red-50 focus-visible:outline-red-500 dark:hover:bg-red-900 sm:w-auto"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}
