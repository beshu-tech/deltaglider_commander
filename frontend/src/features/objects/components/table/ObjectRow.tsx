import { TableCell } from "../../../../lib/ui/Table";
import { formatDateTime } from "../../../../lib/utils/dates";
import { ObjectItem } from "../../types";
import { SelectionTarget } from "../../useObjectSelection";
import { useCompressionStats } from "../../hooks/useCompressionStats";
import { ObjectNameCell } from "../cells/ObjectNameCell";
import { ObjectSizeCell } from "../cells/ObjectSizeCell";
import { CompressionBadge } from "../cells/CompressionBadge";

interface ObjectRowProps {
  item: ObjectItem;
  isSelected: boolean;
  isHighlighted: boolean;
  isLoadingMetadata?: boolean;
  onToggleSelect: (target: SelectionTarget) => void;
  onRowClick: (item: ObjectItem) => void;
}

export function ObjectRow({
  item,
  isSelected,
  isHighlighted,
  isLoadingMetadata = false,
  onToggleSelect,
  onRowClick,
}: ObjectRowProps) {
  const target: SelectionTarget = { type: "object", key: item.key };
  const name = item.key.split("/").pop() ?? item.key;
  const compressionStats = useCompressionStats(item);

  const rowClasses = `cursor-pointer border-b border-ui-border-subtle transition-all duration-fast hover:bg-ui-surface-hover focus-visible:outline-focus focus-visible:outline-offset-[-2px] focus-visible:outline-primary-600 focus-visible:ring-focus focus-visible:ring-primary-600/20 dark:border-ui-border-subtle-dark dark:hover:bg-ui-surface-hover-dark dark:focus-visible:outline-primary-500 dark:focus-visible:ring-primary-500/20 ${
    isHighlighted || isSelected
      ? "bg-ui-surface-active dark:bg-ui-surface-active-dark"
      : "odd:bg-black/5 dark:odd:bg-white/5"
  }`;

  return (
    <tr
      className={rowClasses}
      onClick={() => onRowClick(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onRowClick(item);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`View object ${name}`}
    >
      <TableCell className="w-12">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-ui-border-hover text-primary-600 focus:ring-primary-500 dark:border-ui-border-hover-dark"
          checked={isSelected}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation();
            onToggleSelect(target);
          }}
          aria-checked={isSelected}
          aria-label={`Select ${item.key}`}
        />
      </TableCell>
      <TableCell className="font-medium text-ui-text dark:text-ui-text-dark">
        <ObjectNameCell name={name} fullKey={item.key} />
      </TableCell>
      <TableCell>
        <ObjectSizeCell
          originalBytes={item.original_bytes}
          compressionStats={compressionStats}
          isCompressed={item.compressed}
          isLoadingMetadata={isLoadingMetadata}
        />
      </TableCell>
      <TableCell>{formatDateTime(item.modified)}</TableCell>
      <TableCell>
        <CompressionBadge
          compressionStats={compressionStats}
          item={item}
          isLoading={isLoadingMetadata}
        />
      </TableCell>
    </tr>
  );
}
