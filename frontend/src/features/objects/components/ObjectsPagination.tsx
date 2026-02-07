import { Loader2 } from "lucide-react";
import { Button } from "../../../lib/ui/Button";

interface ObjectsPaginationProps {
  currentPage: number;
  totalPages: number;
  itemsOnPage: number;
  totalItems: number;
  pageSelectedCount: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  isFetching: boolean;
  isLoadingMetadata: boolean;
  fetchProgress?: { loaded: number; total: number | undefined };
  onPreviousPage: () => void;
  onNextPage: () => void;
}

function LoadingStage({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-ui-text-subtle dark:text-ui-text-muted-dark">
      <Loader2 className="h-3 w-3 animate-spin" />
      <span className="text-xs">{label}</span>
    </div>
  );
}

export function ObjectsPagination({
  currentPage,
  totalPages,
  itemsOnPage,
  totalItems,
  pageSelectedCount,
  canGoPrevious,
  canGoNext,
  isFetching,
  isLoadingMetadata,
  fetchProgress,
  onPreviousPage,
  onNextPage,
}: ObjectsPaginationProps) {
  // Determine stage label
  let stageIndicator: JSX.Element | null = null;
  if (isLoadingMetadata && fetchProgress) {
    stageIndicator = (
      <LoadingStage label={`Syncing metadata · ${fetchProgress.loaded.toLocaleString()} objects`} />
    );
  } else if (isLoadingMetadata) {
    stageIndicator = <LoadingStage label="Syncing metadata…" />;
  } else if (isFetching) {
    stageIndicator = <LoadingStage label="Refreshing…" />;
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-ui-border px-5 py-3 text-sm text-ui-text-muted dark:border-ui-border-subtle-dark dark:text-ui-text-muted-dark">
      <div className="flex items-center gap-2">
        <span>
          Page {currentPage} of {totalPages} · {itemsOnPage} of {totalItems} items
          {pageSelectedCount ? ` · ${pageSelectedCount} selected` : ""}
        </span>
      </div>
      <div className="flex items-center gap-2">{stageIndicator}</div>
      <div className="flex items-center gap-2">
        <Button
          data-testid="objects-pagination-button-previous"
          variant="secondary"
          disabled={!canGoPrevious}
          onClick={onPreviousPage}
        >
          Previous
        </Button>
        <Button
          data-testid="objects-pagination-button-next"
          variant="secondary"
          disabled={!canGoNext}
          onClick={onNextPage}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
