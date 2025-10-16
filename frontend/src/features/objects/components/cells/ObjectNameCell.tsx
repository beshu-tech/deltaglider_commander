import { FileText, Folder } from "lucide-react";

interface ObjectNameCellProps {
  name: string;
  fullKey: string;
  isDirectory?: boolean;
}

export function ObjectNameCell({ name, fullKey, isDirectory = false }: ObjectNameCellProps) {
  const Icon = isDirectory ? Folder : FileText;

  return (
    <div className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-ui-surface-active text-ui-text-muted dark:bg-ui-surface-active-dark dark:text-ui-text-muted-dark">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className={isDirectory ? "" : "truncate"} title={fullKey}>
        {name}
      </span>
    </div>
  );
}
