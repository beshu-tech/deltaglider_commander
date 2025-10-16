import { useEffect, useMemo, useRef } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  FileText,
  Folder,
  Loader2,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead } from "../../lib/ui/Table";
import { Tooltip } from "../../lib/ui/Tooltip";
import { formatBytes } from "../../lib/utils/bytes";
import { formatDateTime } from "../../lib/utils/dates";
import { ObjectItem, ObjectSortKey } from "./types";
import { SelectionTarget } from "./useObjectSelection";
import { DirectoryCounts } from "./useDirectoryCounts";
import { DirectoryCountsCell } from "./DirectoryCountsCell";

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
  isLoadingMetadata?: boolean; // True when loading full metadata after preview
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
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const getCompressionStats = (item: ObjectItem) => {
    if (!item.compressed || item.original_bytes === 0) {
      return {
        variant: "none" as const,
        percentage: 0,
        effectiveSize: item.original_bytes,
        deltaBytes: 0,
      };
    }
    const diff = item.original_bytes - item.stored_bytes;
    const deltaBytes = Math.abs(diff);
    const percentage = (deltaBytes / item.original_bytes) * 100;
    return {
      variant: diff >= 0 ? ("savings" as const) : ("growth" as const),
      percentage,
      effectiveSize: item.stored_bytes,
      deltaBytes,
    };
  };

  useEffect(() => {
    if (!headerCheckboxRef.current) {
      return;
    }
    headerCheckboxRef.current.indeterminate =
      pageSelectedCount > 0 && pageSelectedCount < pageSelectableCount;
  }, [pageSelectableCount, pageSelectedCount]);

  const allSelected = pageSelectableCount > 0 && pageSelectedCount === pageSelectableCount;
  const selectionDisabled = pageSelectableCount === 0;

  const renderSortIcon = useMemo(
    () =>
      function render(column: ObjectSortKey) {
        if (sort !== column) {
          return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />;
        }
        return order === "asc" ? (
          <ChevronUp className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
        );
      },
    [order, sort],
  );

  const renderDirectoryRows = () =>
    directories.map((prefix) => {
      // Extract the relative directory name by removing the current prefix
      const fullPath = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
      const label = fullPath.startsWith(currentPrefix)
        ? fullPath.slice(currentPrefix.length)
        : fullPath;
      const counts = directoryFileCounts.get(prefix);
      const target: SelectionTarget = { type: "prefix", key: prefix };
      const directorySelected = isSelected(target);
      const rowClasses = `cursor-pointer border-b border-slate-100 transition-all duration-fast hover:bg-slate-100 focus-visible:outline-focus focus-visible:outline-offset-[-2px] focus-visible:outline-brand-500 focus-visible:ring-focus focus-visible:ring-brand-500/20 dark:border-slate-800 dark:hover:bg-slate-800 dark:focus-visible:outline-brand-400 dark:focus-visible:ring-brand-400/20 ${
        directorySelected ? "bg-brand-50/70 dark:bg-slate-800" : ""
      }`;

      return (
        <tr
          key={`dir-${prefix}`}
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
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600"
              checked={directorySelected}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => {
                event.stopPropagation();
                onToggleSelect(target);
              }}
              aria-checked={directorySelected}
              aria-label={`Select folder ${label}`}
            />
          </TableCell>
          <TableCell className="font-medium text-slate-700 dark:text-slate-200">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                <Folder className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>{label}</span>
            </div>
          </TableCell>
          <TableCell>
            <DirectoryCountsCell counts={counts} />
          </TableCell>
          <TableCell className="text-slate-400 dark:text-slate-500">—</TableCell>
          <TableCell className="text-slate-400 dark:text-slate-500">—</TableCell>
        </tr>
      );
    });

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1 overflow-auto">
        <Table className="min-w-full">
          <TableHead className="sticky top-0 z-10 shadow-elevation-sm dark:shadow-elevation-sm-dark">
            <tr className="bg-white dark:bg-slate-900">
              <th className="w-12 px-3 py-3 text-left">
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600"
                  checked={allSelected}
                  disabled={selectionDisabled}
                  onChange={(event) => {
                    event.stopPropagation();
                    onToggleSelectAll();
                  }}
                  aria-label="Select all items on this page"
                />
              </th>
              <th className="group px-3 py-3 text-left text-label-sm uppercase tracking-wide text-slate-500 transition-colors duration-fast hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <button
                  type="button"
                  onClick={() => onSortChange("name")}
                  className="flex items-center gap-2 text-slate-600 transition-colors duration-fast hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400"
                >
                  <span>Name</span>
                  {renderSortIcon("name")}
                  {isFetching ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-300" />
                  ) : null}
                </button>
              </th>
              <th className="group px-3 py-3 text-left text-label-sm uppercase tracking-wide text-slate-500 transition-colors duration-fast hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <button
                  type="button"
                  onClick={() => onSortChange("size")}
                  className="flex items-center gap-2 text-slate-600 transition-colors duration-fast hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400"
                >
                  <span>Size</span>
                  {renderSortIcon("size")}
                </button>
              </th>
              <th className="group px-3 py-3 text-left text-label-sm uppercase tracking-wide text-slate-500 transition-colors duration-fast hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <button
                  type="button"
                  onClick={() => onSortChange("modified")}
                  className="flex items-center gap-2 text-slate-600 transition-colors duration-fast hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400"
                >
                  <span>Modified</span>
                  {renderSortIcon("modified")}
                </button>
              </th>
              <th className="px-3 py-3 text-left text-label-sm uppercase tracking-wide text-slate-500 transition-colors duration-fast hover:bg-slate-50 dark:hover:bg-slate-800/50">
                Compression
              </th>
            </tr>
          </TableHead>
          <TableBody className="bg-white dark:bg-slate-900">
            {directories.length > 0 ? renderDirectoryRows() : null}
            {objects.map((item) => {
              const target: SelectionTarget = { type: "object", key: item.key };
              const objectSelected = isSelected(target);
              const isHighlighted = selectedKey === item.key;
              const rowClasses = `cursor-pointer border-b border-slate-100 transition-all duration-fast hover:bg-slate-100 focus-visible:outline-focus focus-visible:outline-offset-[-2px] focus-visible:outline-brand-500 focus-visible:ring-focus focus-visible:ring-brand-500/20 dark:border-slate-800 dark:hover:bg-slate-800 dark:focus-visible:outline-brand-400 dark:focus-visible:ring-brand-400/20 ${
                isHighlighted || objectSelected ? "bg-brand-50/70 dark:bg-slate-800" : ""
              }`;
              const name = item.key.split("/").pop() ?? item.key;
              const compressionStats = getCompressionStats(item);
              return (
                <tr
                  key={item.key}
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
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600"
                      checked={objectSelected}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => {
                        event.stopPropagation();
                        onToggleSelect(target);
                      }}
                      aria-checked={objectSelected}
                      aria-label={`Select ${item.key}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                        <FileText className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="truncate" title={item.key}>
                        {name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      // original_bytes is always available in preview data, so show it immediately
                      const { effectiveSize } = compressionStats;
                      if (
                        !isLoadingMetadata &&
                        item.compressed &&
                        item.original_bytes !== effectiveSize
                      ) {
                        // Show compressed size with strikethrough original when metadata is loaded
                        return (
                          <span className="flex flex-col text-sm">
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {formatBytes(effectiveSize)}
                            </span>
                            <span className="text-xs text-slate-400 line-through">
                              {formatBytes(item.original_bytes)}
                            </span>
                          </span>
                        );
                      }
                      // Always show original_bytes (available immediately)
                      return (
                        <span className="font-medium">{formatBytes(item.original_bytes)}</span>
                      );
                    })()}
                  </TableCell>
                  <TableCell>{formatDateTime(item.modified)}</TableCell>
                  <TableCell>
                    {isLoadingMetadata ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      </div>
                    ) : (
                      (() => {
                        const { variant, percentage } = compressionStats;
                        if (!item.compressed || variant === "none") {
                          return (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                              Original
                            </span>
                          );
                        }

                        if (variant === "growth") {
                          const original = formatBytes(item.original_bytes);
                          const stored = formatBytes(item.stored_bytes);
                          return (
                            <Tooltip
                              label={`Delta compression increased this object. The stored delta (${stored}) is larger than the original (${original}). This typically happens when the reference no longer matches closely or the source is already compressed. Re-upload without delta compression or refresh the reference to recover savings.`}
                            >
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-xs font-medium text-rose-800 dark:bg-rose-900 dark:text-rose-200">
                                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                                Growth {percentage.toFixed(1)}%
                              </span>
                            </Tooltip>
                          );
                        }

                        // Color coding based on compression percentage
                        const getCompressionColor = (pct: number) => {
                          if (pct >= 90)
                            return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
                          if (pct >= 70)
                            return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
                          if (pct >= 50)
                            return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
                          if (pct >= 30)
                            return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
                          return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
                        };

                        return (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getCompressionColor(percentage)}`}
                          >
                            {percentage.toFixed(1)}%
                          </span>
                        );
                      })()
                    )}
                  </TableCell>
                </tr>
              );
            })}
            {directories.length === 0 && objects.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-section text-center text-body text-slate-500 dark:text-slate-300"
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
