import { Table, TableBody } from "../../lib/ui/Table";
import { ObjectItem, ObjectSortKey } from "./types";
import { SelectionTarget } from "./useObjectSelection";
import { DirectoryCounts } from "./useDirectoryCounts";
import { TableHeader } from "./components/table/TableHeader";
import { DirectoryRow } from "./components/table/DirectoryRow";
import { ObjectRow } from "./components/table/ObjectRow";
import { MobileView } from "./components/MobileView";
import { useKeyboardNavigation } from "./hooks/useKeyboardNavigation";
import { useNavigationContext } from "./context/NavigationContext";
import { getVisualSelectionKey } from "./logic/navigationSelectionLogic";

interface ObjectsTableProps {
  bucket: string;
  objects: ObjectItem[];
  directories: string[];
  currentPrefix: string;
  sort: ObjectSortKey;
  order: "asc" | "desc";
  onSortChange: (column: ObjectSortKey) => void;
  selectedKey?: string | null;
  isSelected: (target: SelectionTarget) => boolean;
  onToggleSelect: (target: SelectionTarget) => void;
  onToggleSelectAll: () => void;
  pageSelectableCount: number;
  pageSelectedCount: number;
  onRowClick: (item: ObjectItem) => void;
  onEnterDirectory: (prefix: string) => void;
  onNavigateUp: () => void;
  onNavigateToBuckets?: () => void;
  isFetching: boolean;
  isLoadingMetadata?: boolean;
  directoryFileCounts: Map<string, DirectoryCounts>;
}

export function ObjectsTable({
  bucket,
  objects,
  directories,
  currentPrefix,
  sort,
  order,
  onSortChange,
  selectedKey,
  isSelected,
  onToggleSelect,
  onToggleSelectAll,
  pageSelectableCount,
  pageSelectedCount,
  onRowClick,
  onEnterDirectory,
  onNavigateUp,
  onNavigateToBuckets,
  isFetching,
  isLoadingMetadata = false,
  directoryFileCounts,
}: ObjectsTableProps) {
  const allSelected = pageSelectableCount > 0 && pageSelectedCount === pageSelectableCount;
  const selectionDisabled = pageSelectableCount === 0;

  // Only enable keyboard navigation when objects list context is active
  const { isContextActive } = useNavigationContext();
  const isListActive = isContextActive("objects");

  const { containerRef, focusedKey, isKeyboardMode } = useKeyboardNavigation({
    bucket,
    directories,
    objects,
    currentPrefix,
    onEnterDirectory,
    onRowClick,
    onNavigateUp,
    onNavigateToBuckets,
    enabled: isListActive,
  });

  // Determine which key should be visually selected (using pure logic)
  // Priority: keyboard focus (when in keyboard mode) > URL selection
  const visualSelectionKey = getVisualSelectionKey(
    selectedKey ?? null,
    focusedKey,
    isKeyboardMode, // Use isKeyboardMode instead of isListActive
  );

  const renderDirectoryRows = () =>
    directories.map((prefix) => {
      const fullPath = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
      const label = fullPath.startsWith(currentPrefix)
        ? fullPath.slice(currentPrefix.length)
        : fullPath;
      const counts = directoryFileCounts.get(prefix);
      const target: SelectionTarget = { type: "prefix", key: prefix };
      const directorySelected = isSelected(target);
      // Use unified visual selection logic (keyboard focus when active, URL otherwise)
      const isHighlighted = visualSelectionKey === prefix;

      return (
        <DirectoryRow
          key={`dir-${prefix}`}
          prefix={prefix}
          label={label}
          counts={counts}
          isSelected={directorySelected}
          isHighlighted={isHighlighted}
          onToggleSelect={onToggleSelect}
          onEnterDirectory={onEnterDirectory}
        />
      );
    });

  const renderObjectRows = () =>
    objects.map((item) => {
      const target: SelectionTarget = { type: "object", key: item.key };
      const objectSelected = isSelected(target);
      // Use unified visual selection logic (keyboard focus when active, URL otherwise)
      const isHighlighted = visualSelectionKey === item.key;

      return (
        <ObjectRow
          key={item.key}
          item={item}
          isSelected={objectSelected}
          isHighlighted={isHighlighted}
          isLoadingMetadata={isLoadingMetadata}
          onToggleSelect={onToggleSelect}
          onRowClick={onRowClick}
        />
      );
    });

  return (
    <div className="flex h-full flex-col">
      <MobileView
        directories={directories}
        objects={objects}
        currentPrefix={currentPrefix}
        selectedKey={selectedKey}
        directoryFileCounts={directoryFileCounts}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        onToggleSelectAll={onToggleSelectAll}
        onEnterDirectory={onEnterDirectory}
        onRowClick={onRowClick}
        pageSelectedCount={pageSelectedCount}
        allSelected={allSelected}
        selectionDisabled={selectionDisabled}
        isFetching={isFetching}
        isLoadingMetadata={isLoadingMetadata}
      />
      <div
        ref={containerRef}
        role="application"
        aria-label="Objects table with keyboard navigation"
        tabIndex={0}
        className="relative hidden flex-1 overflow-auto md:block focus:outline-none"
      >
        <Table className="min-w-full" role="table">
          <TableHeader
            sort={sort}
            order={order}
            onSortChange={onSortChange}
            allSelected={allSelected}
            selectionDisabled={selectionDisabled}
            pageSelectedCount={pageSelectedCount}
            pageSelectableCount={pageSelectableCount}
            onToggleSelectAll={onToggleSelectAll}
            isFetching={isFetching}
          />
          <TableBody className="bg-ui-surface dark:bg-ui-surface-dark">
            {directories.length > 0 ? renderDirectoryRows() : null}
            {renderObjectRows()}
            {directories.length === 0 && objects.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-[0.9375rem] text-ui-text-muted dark:text-ui-text-muted-dark"
                >
                  No objects found for the current filters.
                </td>
              </tr>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
