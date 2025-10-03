import { useCallback, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "../../app/toast";
import { bulkDeleteObjects, fetchObjects } from "../../lib/api/endpoints";
import { Button } from "../../lib/ui/Button";
import { EmptyState } from "../../lib/ui/EmptyState";
import { downloadObject } from "../../lib/utils/download";
import { ObjectItem, ObjectSortKey, ObjectsSearchState } from "./types";
import { ObjectsTable } from "./ObjectsTable";
import { useObjects } from "./useObjects";
import { ObjectsToolbar } from "./ObjectsToolbar";
import { ObjectsSelectionBar } from "./ObjectsSelectionBar";
import { SelectionTarget, useObjectSelection } from "./useObjectSelection";
import { getCompressionQueryParam } from "./search";

interface ObjectsViewProps {
  bucket: string;
  search: ObjectsSearchState;
  onSearchChange: (next: ObjectsSearchState) => void;
  onRowClick: (item: ObjectItem) => void;
  selectedKey?: string | null;
  onNextPage: (cursor: string) => void;
  onPreviousPage: () => void;
  selectionResetKey?: number;
  onUploadClick?: () => void;
}

export function ObjectsView({
  bucket,
  search,
  onSearchChange,
  onRowClick,
  selectedKey,
  onNextPage,
  onPreviousPage,
  selectionResetKey,
  onUploadClick,
}: ObjectsViewProps) {
  const toast = useToast();

  const updateSearchState = useCallback(
    (updates: Partial<ObjectsSearchState>) => {
      onSearchChange({ ...search, ...updates, cursor: undefined });
    },
    [onSearchChange, search],
  );

  const query = useObjects({
    bucket,
    prefix: search.prefix,
    search: search.search,
    cursor: search.cursor,
    sort: search.sort,
    order: search.order,
    limit: search.limit,
    compressed: getCompressionQueryParam(search),
  });

  const data = query.data;
  const objects = useMemo(() => data?.objects ?? [], [data?.objects]);
  const prefixes = useMemo(() => data?.common_prefixes ?? [], [data?.common_prefixes]);
  const nextCursor = data?.cursor;

  const pageEntries = useMemo<SelectionTarget[]>(() => {
    const directoryEntries = prefixes.map<SelectionTarget>((prefix) => ({
      type: "prefix",
      key: prefix,
    }));
    const objectEntries = objects.map<SelectionTarget>((item) => ({
      type: "object",
      key: item.key,
    }));
    return [...directoryEntries, ...objectEntries];
  }, [objects, prefixes]);

  const selectionResetToken = useMemo(
    () =>
      `${bucket}|${search.prefix}|${search.sort}|${search.order}|${search.compression}|${selectionResetKey ?? ""}`,
    [bucket, search.compression, search.order, search.prefix, search.sort, selectionResetKey],
  );

  const {
    selectedObjects,
    selectedPrefixes,
    isSelected,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    pageSelectableCount,
    pageSelectedCount,
    totalSelectedCount,
    hasSelection,
  } = useObjectSelection({
    pageEntries,
    resetToken: selectionResetToken,
  });

  const handleSortChange = useCallback(
    (column: ObjectSortKey) => {
      const nextOrder =
        search.sort === column
          ? search.order === "asc"
            ? "desc"
            : "asc"
          : column === "name"
            ? "asc"
            : "desc";
      updateSearchState({ sort: column, order: nextOrder });
    },
    [search.order, search.sort, updateSearchState],
  );

  const breadcrumbSegments = useMemo(() => {
    const normalized = search.prefix.endsWith("/") ? search.prefix.slice(0, -1) : search.prefix;
    return normalized ? normalized.split("/").filter(Boolean) : [];
  }, [search.prefix]);

  const breadcrumbs = useMemo(() => {
    const items: Array<{ label: string; value: string | null }> = [{ label: bucket, value: "" }];
    breadcrumbSegments.forEach((segment, index) => {
      const value = `${breadcrumbSegments.slice(0, index + 1).join("/")}/`;
      items.push({ label: segment, value });
    });
    if (selectedKey) {
      const label = selectedKey.split("/").pop() ?? selectedKey;
      items.push({ label, value: null });
    }
    return items;
  }, [bucket, breadcrumbSegments, selectedKey]);

  const handleBreadcrumbNavigate = useCallback(
    (value: string | null) => {
      if (value === null) return;
      updateSearchState({ prefix: value });
    },
    [updateSearchState],
  );

  const handleDirectoryEnter = useCallback(
    (prefixValue: string) => {
      // The prefixValue already contains the full path from the root
      updateSearchState({ prefix: prefixValue });
    },
    [updateSearchState],
  );

  const expandSelectedKeys = useCallback(async (): Promise<string[]> => {
    if (!bucket) {
      return [];
    }
    const collected = new Set<string>(selectedObjects);
    if (selectedPrefixes.length === 0) {
      return Array.from(collected);
    }

    const visited = new Set<string>();
    const queue = [...selectedPrefixes];

    while (queue.length > 0) {
      const currentPrefix = queue.shift() ?? "";
      if (visited.has(currentPrefix)) {
        continue;
      }
      visited.add(currentPrefix);

      let cursor: string | undefined;
      do {
        try {
          const response = await fetchObjects({
            bucket,
            prefix: currentPrefix,
            cursor,
            limit: 500,
            sort: "name",
            order: "asc",
            compressed: "any",
          });
          response.objects.forEach((item) => collected.add(item.key));
          response.common_prefixes.forEach((childPrefix) => {
            if (!visited.has(childPrefix)) {
              queue.push(childPrefix);
            }
          });
          cursor = response.cursor ?? undefined;
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          throw new Error(
            currentPrefix
              ? `Failed to list objects under ${currentPrefix}: ${reason}`
              : `Failed to list objects: ${reason}`,
          );
        }
      } while (cursor);
    }

    return Array.from(collected);
  }, [bucket, selectedObjects, selectedPrefixes]);

  const handleBulkDownload = useCallback(async () => {
    if (!bucket || totalSelectedCount === 0) {
      return;
    }

    let keys: string[];
    try {
      keys = await expandSelectedKeys();
    } catch (error) {
      toast.push({
        title: "Download failed",
        description: error instanceof Error ? error.message : String(error),
        level: "error",
      });
      return;
    }

    if (keys.length === 0) {
      toast.push({
        title: "Nothing to download",
        description: "Selected folders do not contain any objects.",
        level: "info",
      });
      clearSelection();
      return;
    }

    toast.push({
      title: `Preparing ${keys.length} download${keys.length === 1 ? "" : "s"}`,
      level: "info",
    });

    for (const key of keys) {
      try {
        await downloadObject(bucket, key);
      } catch (error) {
        toast.push({
          title: "Download failed",
          description: `${key}: ${error instanceof Error ? error.message : String(error)}`,
          level: "error",
        });
      }
    }

    toast.push({
      title: "Downloads ready",
      description: `${keys.length} file${keys.length === 1 ? "" : "s"} queued in your browser`,
      level: "success",
    });
    clearSelection();
  }, [bucket, clearSelection, expandSelectedKeys, toast, totalSelectedCount]);

  const handleBulkDelete = useCallback(async () => {
    if (!bucket || totalSelectedCount === 0) {
      return;
    }

    // Show confirmation dialog using toast
    const confirmDelete = confirm(
      `Are you sure you want to delete ${totalSelectedCount} selected item${totalSelectedCount === 1 ? "" : "s"}? This action cannot be undone.`,
    );

    if (!confirmDelete) {
      return;
    }

    let keys: string[];
    try {
      keys = await expandSelectedKeys();
    } catch (error) {
      toast.push({
        title: "Delete failed",
        description: error instanceof Error ? error.message : String(error),
        level: "error",
      });
      return;
    }

    if (keys.length === 0) {
      toast.push({
        title: "Nothing to delete",
        description: "Selected folders do not contain any objects.",
        level: "info",
      });
      clearSelection();
      return;
    }

    toast.push({
      title: `Deleting ${keys.length} object${keys.length === 1 ? "" : "s"}...`,
      level: "info",
    });

    try {
      const result = await bulkDeleteObjects(bucket, keys);

      if (result.total_errors > 0) {
        // Show summary of partial success
        toast.push({
          title: "Delete completed with errors",
          description: `${result.total_deleted} deleted, ${result.total_errors} failed`,
          level: "error",
        });

        // Show first few error details
        result.errors.slice(0, 3).forEach((error) => {
          toast.push({
            title: `Failed to delete ${error.key}`,
            description: error.error,
            level: "error",
          });
        });
      } else {
        toast.push({
          title: "Delete successful",
          description: `${result.total_deleted} object${result.total_deleted === 1 ? "" : "s"} deleted`,
          level: "success",
        });
      }
    } catch (error) {
      toast.push({
        title: "Delete failed",
        description: error instanceof Error ? error.message : String(error),
        level: "error",
      });
    }

    // Clear selection and refresh the view
    clearSelection();
    // Trigger a refetch by updating the query
    query.refetch();
  }, [bucket, clearSelection, expandSelectedKeys, toast, totalSelectedCount, query]);

  const canGoPrevious = search.cursor !== undefined;
  const canGoNext = Boolean(nextCursor);

  let tableContent: JSX.Element;
  if (query.isError) {
    tableContent = (
      <div className="flex flex-1 items-center justify-center py-12">
        <EmptyState title="Could not load objects" message={String(query.error)} />
      </div>
    );
  } else if (query.isLoading && !data) {
    tableContent = (
      <div className="flex flex-1 items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  } else {
    tableContent = (
      <ObjectsTable
        objects={objects}
        directories={prefixes}
        currentPrefix={search.prefix}
        sort={search.sort}
        order={search.order}
        onSortChange={handleSortChange}
        isSelected={isSelected}
        selectedKey={selectedKey}
        onToggleSelect={toggleSelection}
        onToggleSelectAll={toggleSelectAll}
        pageSelectableCount={pageSelectableCount}
        pageSelectedCount={pageSelectedCount}
        onRowClick={onRowClick}
        onEnterDirectory={handleDirectoryEnter}
        isFetching={query.isFetching}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <ObjectsToolbar
        bucket={bucket}
        prefix={search.prefix}
        search={search.search}
        breadcrumbs={breadcrumbs}
        compression={search.compression}
        onSearchChange={(value) => updateSearchState({ search: value })}
        onCompressionChange={(value) => updateSearchState({ compression: value })}
        onBreadcrumbNavigate={handleBreadcrumbNavigate}
        onUploadClick={onUploadClick}
      />
      {hasSelection ? (
        <ObjectsSelectionBar
          totalSelected={totalSelectedCount}
          pageSelected={pageSelectedCount}
          isFetching={query.isFetching}
          onClear={clearSelection}
          onBulkDownload={handleBulkDownload}
          onBulkDelete={handleBulkDelete}
        />
      ) : null}
      <div className="flex-1 overflow-hidden">{tableContent}</div>
      <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
        <div className="flex items-center gap-2">
          {query.isFetching ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
          <span>
            Showing {objects.length} object{objects.length === 1 ? "" : "s"}
            {pageSelectedCount ? ` · ${pageSelectedCount} selected here` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" disabled={!canGoPrevious} onClick={onPreviousPage}>
            Previous
          </Button>
          <Button
            variant="secondary"
            disabled={!canGoNext}
            onClick={() => {
              if (nextCursor) {
                onNextPage(nextCursor);
              }
            }}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
