import { TableCell } from "../../../../lib/ui/Table";
import { SelectionTarget } from "../../useObjectSelection";
import { DirectoryCounts } from "../../useDirectoryCounts";
import { DirectoryCountsCell } from "../../DirectoryCountsCell";
import { ObjectNameCell } from "../cells/ObjectNameCell";
import { getTableRowClasses } from "./tableRowStyles";

interface DirectoryRowProps {
  prefix: string;
  label: string;
  counts: DirectoryCounts | undefined;
  isSelected: boolean;
  isHighlighted: boolean;
  onToggleSelect: (target: SelectionTarget) => void;
  onEnterDirectory: (prefix: string) => void;
}

export function DirectoryRow({
  prefix,
  label,
  counts,
  isSelected,
  isHighlighted,
  onToggleSelect,
  onEnterDirectory,
}: DirectoryRowProps) {
  const target: SelectionTarget = { type: "prefix", key: prefix };

  return (
    <tr
      className={getTableRowClasses({ isSelected, isHighlighted })}
      onClick={() => onEnterDirectory(prefix)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEnterDirectory(prefix);
        }
      }}
      tabIndex={-1}
      role="row"
      aria-label={`Folder: ${label}`}
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
          aria-label={`Select folder ${label}`}
        />
      </TableCell>
      <TableCell className="font-medium text-ui-text dark:text-ui-text-dark">
        <ObjectNameCell name={label} fullKey={prefix} isDirectory />
      </TableCell>
      <TableCell>
        <DirectoryCountsCell counts={counts} />
      </TableCell>
      <TableCell className="text-ui-text-subtle dark:text-ui-text-muted">—</TableCell>
      <TableCell className="text-ui-text-subtle dark:text-ui-text-muted">—</TableCell>
    </tr>
  );
}
