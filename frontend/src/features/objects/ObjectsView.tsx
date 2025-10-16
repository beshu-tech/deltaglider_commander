import { useCallback, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useToast } from "../../app/toast";
import { bulkDeleteObjects, BULK_DELETE_BATCH_SIZE, fetchObjects } from "../../lib/api/endpoints";
import { Button } from "../../lib/ui/Button";
import { EmptyState } from "../../lib/ui/EmptyState";
import { downloadObject } from "../../lib/utils/download";
import { ObjectItem, ObjectSortKey, ObjectsSearchState } from "./types";
import { ObjectsTable } from "./ObjectsTable";
import { useObjectsCache } from "./useObjectsCache";
import { ObjectsToolbar } from "./ObjectsToolbar";
import { ObjectsSelectionBar } from "./ObjectsSelectionBar";
import { SelectionTarget, useObjectSelection } from "./useObjectSelection";
import { getCompressionQueryParam } from "./search";
import { clearObjectsCache } from "./objectsCache";
import { useQueryClient } from "@tanstack/react-query";
import { removeFromLocalStorage } from "../../lib/cache/localStorage";
import { qk } from "../../lib/api/queryKeys";

interface ObjectsViewProps {
  bucket: string;
  search: ObjectsSearchState;
  onSearchChange: (next: ObjectsSearchState) => void;
  onRowClick: (item: ObjectItem) => void;
  selectedKey?: string | null;
  onNextPage: () => void;
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
  const queryClient = useQueryClient();

  const updateSearchState = useCallback(
    (updates: Partial<ObjectsSearchState>) => {
      onSearchChange({ ...search, ...updates, pageIndex: 0 });
    },
    [onSearchChange, search],
  );

  const cacheQuery = useObjectsCache({
    bucket,
    prefix: search.prefix,
    search: search.search,
    compressed: getCompressionQueryParam(search),
    sort: search.sort,
    order: search.order,
    pageIndex: search.pageIndex,
    pageSize: search.limit,
  });

  const objects = cacheQuery.objects;
  const prefixes = cacheQuery.directories;
  const directoryFileCounts = cacheQuery.directoryFileCounts;

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
    const items: Array<{ label: string; value: string | null; isHome?: boolean }> = [
      { label: "Dashboard", value: null, isHome: true },
      { label: bucket, value: "" },
    ];
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

  const navigate = useNavigate();

  const handleBreadcrumbNavigate = useCallback(
    (value: string | null, isHome?: boolean) => {
      if (value === null && !isHome) return;
      if (isHome) {
        navigate({ to: "/buckets" });
        return;
      }
      updateSearchState({ prefix: value ?? undefined });
    },
    [navigate, updateSearchState],
  );

  const handleForceRefresh = useCallback(() => {
    void cacheQuery.refetch();
  }, [cacheQuery]);

  const handleClearCache = useCallback(() => {
    const confirmed = confirm(
      "Clear all cached directory listings? This will reload data from the server.",
    );
    if (!confirmed) {
      return;
    }

    // Clear localStorage cache
    clearObjectsCache();

    // Clear TanStack Query cache
    void queryClient.invalidateQueries({ queryKey: ["objects", "full"] });

    toast.push({
      title: "Cache cleared",
      description: "All cached directory listings have been cleared",
      level: "success",
    });
  }, [queryClient, toast]);

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

    const totalBatches = Math.ceil(keys.length / BULK_DELETE_BATCH_SIZE);

    const progressToastId = toast.push({
      title: `Deleting ${keys.length} object${keys.length === 1 ? "" : "s"}...`,
      description:
        totalBatches > 1
          ? `0/${keys.length} deleted · processing ${totalBatches} batch${
              totalBatches === 1 ? "" : "es"
            }`
          : `0/${keys.length} deleted`,
      level: "info",
      autoDismissMs: null,
    });

    try {
      let deletedSoFar = 0;
      let errorsSoFar = 0;

      const result = await bulkDeleteObjects(bucket, keys, {
        onBatchComplete: ({ batchIndex, batchCount, deleted, errors }) => {
          deletedSoFar += deleted.length;
          errorsSoFar += errors.length;

          const details = [
            `${deletedSoFar}/${keys.length} deleted`,
            `batch ${batchIndex + 1}/${batchCount}`,
          ];
          if (errorsSoFar > 0) {
            details.push(`${errorsSoFar} failed`);
          }

          toast.update(progressToastId, {
            description: details.join(" · "),
            level: errorsSoFar > 0 ? "error" : "info",
            autoDismissMs: null,
          });
        },
      });

      if (result.total_errors > 0) {
        // Show summary of partial success
        toast.update(progressToastId, {
          title: "Delete completed with errors",
          description: `${result.total_deleted} deleted, ${result.total_errors} failed`,
          level: "error",
          autoDismissMs: 7000,
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
        toast.update(progressToastId, {
          title: "Delete successful",
          description: `${result.total_deleted} object${
            result.total_deleted === 1 ? "" : "s"
          } deleted`,
          level: "success",
          autoDismissMs: 3000,
        });
      }
    } catch (error) {
      toast.update(progressToastId, {
        title: "Delete failed",
        description: error instanceof Error ? error.message : String(error),
        level: "error",
        autoDismissMs: 7000,
      });
    }

    // Clear localStorage cache for affected directories (smart invalidation)
    // Since bulk delete can affect multiple directories, clear the current directory and parents
    const prefixParts = search.prefix.split("/").filter(Boolean);

    // Clear cache for current prefix
    removeFromLocalStorage(qk.objectsFull(bucket, search.prefix, undefined, "any"));

    // Clear cache for parent directories (bulk deletion affects parent listings)
    for (let i = 0; i < prefixParts.length; i++) {
      const parentPrefix = prefixParts.slice(0, i).join("/");
      const normalizedParent = parentPrefix ? `${parentPrefix}/` : "";
      removeFromLocalStorage(qk.objectsFull(bucket, normalizedParent, undefined, "any"));
    }

    // Clear selection and refresh the view
    clearSelection();
    // Trigger a refetch by updating the query (bypasses localStorage)
    cacheQuery.refetch();
    queryClient.invalidateQueries({ queryKey: qk.buckets });
    queryClient.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey[0] === "bucket-stats" &&
        query.queryKey[1] === bucket,
    });
    queryClient.invalidateQueries({
      predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "stats",
    });
  }, [
    bucket,
    search.prefix,
    clearSelection,
    expandSelectedKeys,
    toast,
    totalSelectedCount,
    cacheQuery,
    queryClient,
  ]);

  const canGoPrevious = cacheQuery.hasPreviousPage;
  const canGoNext = cacheQuery.hasNextPage;

  let tableContent: JSX.Element;
  if (cacheQuery.isError) {
    tableContent = (
      <div className="flex flex-1 items-center justify-center py-12">
        <EmptyState title="Could not load objects" message={String(cacheQuery.error)} />
      </div>
    );
  } else if (cacheQuery.isLoading && objects.length === 0 && prefixes.length === 0) {
    // Only show loading spinner if we have no data yet (not even preview)
    tableContent = (
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          {cacheQuery.fetchProgress && (
            <p className="text-sm text-slate-500">
              Loading... {cacheQuery.fetchProgress.loaded} objects
            </p>
          )}
        </div>
      </div>
    );
  } else {
    // Show table if we have data (even if still loading full dataset)
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
        isFetching={cacheQuery.isFetching}
        isLoadingMetadata={cacheQuery.isLoadingFull}
        directoryFileCounts={directoryFileCounts}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden border border-slate-200 bg-white shadow-elevation-md dark:border-slate-800 dark:bg-slate-900 dark:shadow-elevation-md-dark">
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
        onClearCache={handleClearCache}
        onForceRefresh={handleForceRefresh}
        isRefreshing={cacheQuery.isFetching}
      />
      {hasSelection ? (
        <ObjectsSelectionBar
          totalSelected={totalSelectedCount}
          pageSelected={pageSelectedCount}
          isFetching={cacheQuery.isFetching}
          onClear={clearSelection}
          onBulkDownload={handleBulkDownload}
          onBulkDelete={handleBulkDelete}
        />
      ) : (
        <div className="h-3" />
      )}
      <div className="flex-1 overflow-hidden">{tableContent}</div>
      <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <span>
            Page {cacheQuery.currentPage} of {cacheQuery.totalPages} ·{" "}
            {objects.length + prefixes.length} of {cacheQuery.totalItems} items
            {pageSelectedCount ? ` · ${pageSelectedCount} selected` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {cacheQuery.isFetching && !cacheQuery.isLoadingFull ? (
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Fetching files...</span>
            </div>
          ) : cacheQuery.isLoadingFull ? (
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Retrieving compression metadata...</span>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" disabled={!canGoPrevious} onClick={onPreviousPage}>
            Previous
          </Button>
          <Button variant="secondary" disabled={!canGoNext} onClick={onNextPage}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
