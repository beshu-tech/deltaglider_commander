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
    <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {totalSelected}
        </span>
        <span>selected</span>
        <Badge className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
          {pageSelected} on this page
        </Badge>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium uppercase tracking-wide text-brand-600 transition hover:text-brand-500"
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
