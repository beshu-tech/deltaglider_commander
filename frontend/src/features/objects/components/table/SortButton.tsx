import { ArrowUpDown, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { ObjectSortKey } from "../../types";

interface SortButtonProps {
  column: ObjectSortKey;
  currentSort: ObjectSortKey;
  order: "asc" | "desc";
  onSortChange: (column: ObjectSortKey) => void;
  isFetching?: boolean;
  children: React.ReactNode;
}

export function SortButton({
  column,
  currentSort,
  order,
  onSortChange,
  isFetching = false,
  children,
}: SortButtonProps) {
  const isActive = currentSort === column;

  const renderIcon = () => {
    if (!isActive) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-ui-text-subtle" aria-hidden="true" />;
    }
    return order === "asc" ? (
      <ChevronUp className="h-3.5 w-3.5 text-ui-icon dark:text-ui-icon-dark" aria-hidden="true" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-ui-icon dark:text-ui-icon-dark" aria-hidden="true" />
    );
  };

  return (
    <button
      type="button"
      onClick={() => onSortChange(column)}
      className="flex items-center gap-2 text-ui-text-muted transition-colors duration-fast hover:text-ui-text dark:text-ui-text-muted-dark dark:hover:text-ui-text-dark"
    >
      <span>{children}</span>
      {renderIcon()}
      {isFetching && column === "name" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-ui-text-muted-dark" />
      ) : null}
    </button>
  );
}
