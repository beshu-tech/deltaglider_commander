import { useEffect, useRef } from "react";
import { TableHead } from "../../../../lib/ui/Table";
import { ObjectSortKey } from "../../types";
import { SortButton } from "./SortButton";

interface TableHeaderProps {
  sort: ObjectSortKey;
  order: "asc" | "desc";
  onSortChange: (column: ObjectSortKey) => void;
  allSelected: boolean;
  selectionDisabled: boolean;
  pageSelectedCount: number;
  pageSelectableCount: number;
  onToggleSelectAll: () => void;
  isFetching: boolean;
}

export function TableHeader({
  sort,
  order,
  onSortChange,
  allSelected,
  selectionDisabled,
  pageSelectedCount,
  pageSelectableCount,
  onToggleSelectAll,
  isFetching,
}: TableHeaderProps) {
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!headerCheckboxRef.current) {
      return;
    }
    headerCheckboxRef.current.indeterminate =
      pageSelectedCount > 0 && pageSelectedCount < pageSelectableCount;
  }, [pageSelectableCount, pageSelectedCount]);

  return (
    <TableHead className="sticky top-0 z-10 shadow-elevation-sm dark:shadow-elevation-sm-dark">
      <tr className="bg-ui-surface dark:bg-ui-surface-dark">
        <th className="w-12 px-3 py-3 text-left">
          <input
            ref={headerCheckboxRef}
            type="checkbox"
            className="h-4 w-4 rounded border-ui-border-hover text-primary-600 focus:ring-primary-500 dark:border-ui-border-hover-dark"
            checked={allSelected}
            disabled={selectionDisabled}
            onChange={(event) => {
              event.stopPropagation();
              onToggleSelectAll();
            }}
            aria-label="Select all items on this page"
          />
        </th>
        <th className="group px-3 py-3 text-left text-label-sm uppercase tracking-wide text-ui-text-muted transition-colors duration-fast hover:bg-ui-surface-hover dark:hover:bg-ui-surface-hover-dark/50">
          <SortButton
            column="name"
            currentSort={sort}
            order={order}
            onSortChange={onSortChange}
            isFetching={isFetching}
          >
            Name
          </SortButton>
        </th>
        <th className="group px-3 py-3 text-left text-label-sm uppercase tracking-wide text-ui-text-muted transition-colors duration-fast hover:bg-ui-surface-hover dark:hover:bg-ui-surface-hover-dark/50">
          <SortButton column="size" currentSort={sort} order={order} onSortChange={onSortChange}>
            Size
          </SortButton>
        </th>
        <th className="group px-3 py-3 text-left text-label-sm uppercase tracking-wide text-ui-text-muted transition-colors duration-fast hover:bg-ui-surface-hover dark:hover:bg-ui-surface-hover-dark/50">
          <SortButton column="modified" currentSort={sort} order={order} onSortChange={onSortChange}>
            Modified
          </SortButton>
        </th>
        <th className="px-3 py-3 text-left text-label-sm uppercase tracking-wide text-ui-text-muted transition-colors duration-fast hover:bg-ui-surface-hover dark:hover:bg-ui-surface-hover-dark/50">
          Compression
        </th>
      </tr>
    </TableHead>
  );
}
