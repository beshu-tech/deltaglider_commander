import { TableCell } from "../../../../lib/ui/Table";
import { formatDateTime } from "../../../../lib/utils/dates";
import { ObjectItem } from "../../types";
import { SelectionTarget } from "../../useObjectSelection";
import { useCompressionStats } from "../../hooks/useCompressionStats";
import { ObjectNameCell } from "../cells/ObjectNameCell";
import { ObjectSizeCell } from "../cells/ObjectSizeCell";
import { CompressionBadge } from "../cells/CompressionBadge";
import { getTableRowClasses } from "./tableRowStyles";

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

  return (
    <tr
      className={getTableRowClasses({ isSelected, isHighlighted })}
      onClick={() => onRowClick(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onRowClick(item);
        }
      }}
      tabIndex={-1}
      role="row"
      aria-label={`Object: ${name}`}
      aria-selected={isHighlighted}
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
      <TableCell className="whitespace-nowrap">{formatDateTime(item.modified)}</TableCell>
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
