import { TableCell } from "../../../../lib/ui/Table";
import { SelectionTarget } from "../../useObjectSelection";
import { DirectoryCounts } from "../../useDirectoryCounts";
import { DirectoryCountsCell } from "../../DirectoryCountsCell";
import { ObjectNameCell } from "../cells/ObjectNameCell";

interface DirectoryRowProps {
  prefix: string;
  label: string;
  counts: DirectoryCounts | undefined;
  isSelected: boolean;
  onToggleSelect: (target: SelectionTarget) => void;
  onEnterDirectory: (prefix: string) => void;
}

export function DirectoryRow({
  prefix,
  label,
  counts,
  isSelected,
  onToggleSelect,
  onEnterDirectory,
}: DirectoryRowProps) {
  const target: SelectionTarget = { type: "prefix", key: prefix };

  const rowClasses = `cursor-pointer border-b border-ui-border-subtle transition-all duration-fast hover:bg-ui-surface-hover focus-visible:outline-focus focus-visible:outline-offset-[-2px] focus-visible:outline-primary-600 focus-visible:ring-focus focus-visible:ring-primary-600/20 dark:border-ui-border-subtle-dark dark:hover:bg-ui-surface-hover-dark dark:focus-visible:outline-primary-500 dark:focus-visible:ring-primary-500/20 ${
    isSelected
      ? "bg-ui-surface-active dark:bg-ui-surface-active-dark"
      : "odd:bg-black/5 dark:odd:bg-white/5"
  }`;

  return (
    <tr
      className={rowClasses}
      onClick={() => onEnterDirectory(prefix)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEnterDirectory(prefix);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Open folder ${label}`}
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
