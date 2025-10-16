import { Loader2 } from "lucide-react";
import { ObjectItem } from "../types";
import { SelectionTarget } from "../useObjectSelection";
import { DirectoryCounts } from "../useDirectoryCounts";
import { DirectoryCard } from "./cards/DirectoryCard";
import { ObjectCard } from "./cards/ObjectCard";

interface MobileViewProps {
  directories: string[];
  objects: ObjectItem[];
  currentPrefix: string;
  selectedKey?: string | null;
  directoryFileCounts: Map<string, DirectoryCounts>;
  isSelected: (target: SelectionTarget) => boolean;
  onToggleSelect: (target: SelectionTarget) => void;
  onToggleSelectAll: () => void;
  onEnterDirectory: (prefix: string) => void;
  onRowClick: (item: ObjectItem) => void;
  pageSelectedCount: number;
  allSelected: boolean;
  selectionDisabled: boolean;
  isFetching: boolean;
  isLoadingMetadata?: boolean;
}

export function MobileView({
  directories,
  objects,
  currentPrefix,
  selectedKey,
  directoryFileCounts,
  isSelected,
  onToggleSelect,
  onToggleSelectAll,
  onEnterDirectory,
  onRowClick,
  pageSelectedCount,
  allSelected,
  selectionDisabled,
  isFetching,
  isLoadingMetadata = false,
}: MobileViewProps) {
  const renderDirectoryCards = () =>
    directories.map((prefix) => {
      const fullPath = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
      const label = fullPath.startsWith(currentPrefix)
        ? fullPath.slice(currentPrefix.length)
        : fullPath;
      const counts = directoryFileCounts.get(prefix);
      const target: SelectionTarget = { type: "prefix", key: prefix };
      const directorySelected = isSelected(target);

      return (
        <DirectoryCard
          key={`dir-card-${prefix}`}
          prefix={prefix}
          label={label}
          counts={counts}
          isSelected={directorySelected}
          onToggleSelect={onToggleSelect}
          onEnterDirectory={onEnterDirectory}
        />
      );
    });

  const renderObjectCards = () =>
    objects.map((item) => {
      const target: SelectionTarget = { type: "object", key: item.key };
      const objectSelected = isSelected(target);
      const objectActive = selectedKey === item.key;

      return (
        <ObjectCard
          key={`obj-card-${item.key}`}
          item={item}
          isSelected={objectSelected}
          isActive={objectActive}
          onToggleSelect={onToggleSelect}
          onRowClick={onRowClick}
        />
      );
    });

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-1 pb-4 md:hidden">
      {!selectionDisabled ? (
        <div className="flex items-center justify-between rounded-lg border border-ui-border bg-ui-surface px-3 py-2 text-sm shadow-sm dark:border-ui-border-dark dark:bg-ui-surface-dark">
          <span className="text-ui-text-muted dark:text-ui-text-muted-dark">
            {pageSelectedCount} selected
          </span>
          <button
            type="button"
            onClick={onToggleSelectAll}
            className="rounded-md border border-ui-border-hover px-3 py-1 text-xs font-medium uppercase tracking-wide text-ui-text-muted transition hover:bg-ui-surface-hover focus-visible:outline-focus focus-visible:outline-offset-2 focus-visible:outline-primary-600 dark:border-ui-border-hover-dark dark:text-ui-text-dark dark:hover:bg-ui-surface-hover-dark"
          >
            {allSelected ? "Clear" : "Select all"}
          </button>
        </div>
      ) : null}
      {directories.length === 0 && objects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ui-border bg-ui-surface px-3 py-4 text-center text-sm text-ui-text-muted shadow-sm dark:border-ui-border-dark dark:bg-ui-surface-dark dark:text-ui-text-muted-dark">
          No objects in this directory
        </div>
      ) : (
        <>
          {renderDirectoryCards()}
          {renderObjectCards()}
        </>
      )}
      {isFetching || isLoadingMetadata ? (
        <div className="flex items-center gap-2 rounded-lg border border-ui-border bg-ui-surface px-3 py-2 text-sm text-ui-text-muted shadow-sm dark:border-ui-border-dark dark:bg-ui-surface-dark dark:text-ui-text-muted-dark">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating…
        </div>
      ) : null}
    </div>
  );
}
