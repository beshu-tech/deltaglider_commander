import { Table, TableBody } from "../../lib/ui/Table";
import { ObjectItem, ObjectSortKey } from "./types";
import { SelectionTarget } from "./useObjectSelection";
import { DirectoryCounts } from "./useDirectoryCounts";
import { TableHeader } from "./components/table/TableHeader";
import { DirectoryRow } from "./components/table/DirectoryRow";
import { ObjectRow } from "./components/table/ObjectRow";
import { MobileView } from "./components/MobileView";

interface ObjectsTableProps {
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
  isFetching: boolean;
  isLoadingMetadata?: boolean;
  directoryFileCounts: Map<string, DirectoryCounts>;
}

export function ObjectsTable({
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
  isFetching,
  isLoadingMetadata = false,
  directoryFileCounts,
}: ObjectsTableProps) {
  const allSelected = pageSelectableCount > 0 && pageSelectedCount === pageSelectableCount;
  const selectionDisabled = pageSelectableCount === 0;

  const renderDirectoryRows = () =>
    directories.map((prefix) => {
      const fullPath = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
      const label = fullPath.startsWith(currentPrefix)
        ? fullPath.slice(currentPrefix.length)
        : fullPath;
      const counts = directoryFileCounts.get(prefix);
      const target: SelectionTarget = { type: "prefix", key: prefix };
      const directorySelected = isSelected(target);

      return (
        <DirectoryRow
          key={`dir-${prefix}`}
          prefix={prefix}
          label={label}
          counts={counts}
          isSelected={directorySelected}
          onToggleSelect={onToggleSelect}
          onEnterDirectory={onEnterDirectory}
        />
      );
    });

  const renderObjectRows = () =>
    objects.map((item) => {
      const target: SelectionTarget = { type: "object", key: item.key };
      const objectSelected = isSelected(target);
      const isHighlighted = selectedKey === item.key;

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
      <div className="relative hidden flex-1 overflow-auto md:block">
        <Table className="min-w-full">
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
                  className="px-3 py-section text-center text-body text-ui-text-muted dark:text-ui-text-muted-dark"
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
