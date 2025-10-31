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
  onPreviousPage: () => void;
  onNextPage: () => void;
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
  onPreviousPage,
  onNextPage,
}: ObjectsPaginationProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-ui-border px-5 py-3 text-sm text-ui-text-muted dark:border-ui-border-subtle-dark dark:text-ui-text-muted-dark">
      <div className="flex items-center gap-2">
        <span>
          Page {currentPage} of {totalPages} · {itemsOnPage} of {totalItems} items
          {pageSelectedCount ? ` · ${pageSelectedCount} selected` : ""}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {isFetching && !isLoadingMetadata ? (
          <div className="flex items-center gap-2 text-ui-text-muted dark:text-ui-text-subtle">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Fetching files...</span>
          </div>
        ) : isLoadingMetadata ? (
          <div className="flex items-center gap-2 text-ui-text-muted dark:text-ui-text-subtle">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Retrieving compression metadata...</span>
          </div>
        ) : null}
      </div>
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
