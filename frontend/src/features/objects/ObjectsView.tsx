import { useCallback, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { OBJECT_COUNT_LIMIT } from "../../lib/constants/api";
import { ObjectItem, ObjectSortKey, ObjectsSearchState } from "./types";
import { ObjectsTable } from "./ObjectsTable";
import { useObjectsCache } from "./useObjectsCache";
import { ObjectsToolbar } from "./ObjectsToolbar";
import { ObjectsSelectionBar } from "./ObjectsSelectionBar";
import { SelectionTarget, useObjectSelection } from "./useObjectSelection";
import { getCompressionQueryParam } from "./search";
import { ObjectsPagination } from "./components/ObjectsPagination";
import { ObjectsLoadingState } from "./components/ObjectsLoadingState";
import { useBreadcrumbs } from "./hooks/useBreadcrumbs";
import { useBulkOperations } from "./hooks/useBulkOperations";

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
  const navigate = useNavigate();

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

  const { breadcrumbs, handleBreadcrumbNavigate } = useBreadcrumbs({
    bucket,
    prefix: search.prefix,
    selectedKey,
    onPrefixChange: (prefix) => updateSearchState({ prefix }),
  });

  const { handleBulkDownload, handleBulkDelete } = useBulkOperations({
    bucket,
    selectedObjects,
    selectedPrefixes,
    clearSelection,
    refetchObjects: () => cacheQuery.refetch(),
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

  const handleForceRefresh = useCallback(() => {
    void cacheQuery.refetch({ bypassBackendCache: true });
  }, [cacheQuery]);

  const handleDirectoryEnter = useCallback(
    (prefixValue: string) => {
      updateSearchState({ prefix: prefixValue });
    },
    [updateSearchState],
  );

  const handleNavigateUp = useCallback(() => {
    // Navigate up one folder level
    if (!search.prefix) return;

    const normalized = search.prefix.endsWith("/") ? search.prefix.slice(0, -1) : search.prefix;
    const segments = normalized.split("/").filter(Boolean);

    if (segments.length === 0) {
      updateSearchState({ prefix: "" });
    } else {
      segments.pop();
      const parentPrefix = segments.length > 0 ? `${segments.join("/")}/` : "";
      updateSearchState({ prefix: parentPrefix });
    }
  }, [search.prefix, updateSearchState]);

  const handleNavigateToBuckets = useCallback(() => {
    navigate({ to: "/buckets" });
  }, [navigate]);

  const hasData = objects.length > 0 || prefixes.length > 0;
  const isTruncated = cacheQuery.limited;

  // Show loading/error states, otherwise show the table
  let tableContent: JSX.Element;
  if (cacheQuery.isError) {
    tableContent = (
      <ObjectsLoadingState
        isError={cacheQuery.isError}
        isLoading={cacheQuery.isLoading}
        error={cacheQuery.error}
        hasData={hasData}
        fetchProgress={cacheQuery.fetchProgress}
      />
    );
  } else if (cacheQuery.isLoading && !hasData) {
    tableContent = (
      <ObjectsLoadingState
        isError={cacheQuery.isError}
        isLoading={cacheQuery.isLoading}
        error={cacheQuery.error}
        hasData={hasData}
        fetchProgress={cacheQuery.fetchProgress}
      />
    );
  } else {
    tableContent = (
      <ObjectsTable
        bucket={bucket}
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
        onNavigateUp={handleNavigateUp}
        onNavigateToBuckets={handleNavigateToBuckets}
        isFetching={cacheQuery.isFetching}
        isLoadingMetadata={cacheQuery.isLoadingFull}
        directoryFileCounts={directoryFileCounts}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden border border-ui-border bg-ui-surface shadow-elevation-md dark:border-ui-border-dark dark:bg-ui-surface-dark dark:shadow-elevation-md-dark">
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
        onForceRefresh={handleForceRefresh}
        isRefreshing={cacheQuery.isFetching}
      />
      {isTruncated && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-200">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <div>
            <strong>Listing truncated:</strong> This bucket contains more than{" "}
            {OBJECT_COUNT_LIMIT.toLocaleString()} objects. Only the first{" "}
            {OBJECT_COUNT_LIMIT.toLocaleString()} are displayed. Use search or filters to narrow
            results.
          </div>
        </div>
      )}
      {hasSelection ? (
        <ObjectsSelectionBar
          totalSelected={totalSelectedCount}
          pageSelected={pageSelectedCount}
          isFetching={cacheQuery.isFetching}
          onClear={clearSelection}
          onBulkDownload={() => handleBulkDownload(totalSelectedCount)}
          onBulkDelete={() => handleBulkDelete(totalSelectedCount)}
        />
      ) : (
        <div className="h-3" />
      )}
      <div className="flex-1 overflow-hidden">{tableContent}</div>
      <ObjectsPagination
        currentPage={cacheQuery.currentPage}
        totalPages={cacheQuery.totalPages}
        itemsOnPage={objects.length + prefixes.length}
        totalItems={cacheQuery.totalItems}
        pageSelectedCount={pageSelectedCount}
        canGoPrevious={cacheQuery.hasPreviousPage}
        canGoNext={cacheQuery.hasNextPage}
        isFetching={cacheQuery.isFetching}
        isLoadingMetadata={cacheQuery.isLoadingFull}
        fetchProgress={cacheQuery.fetchProgress}
        onPreviousPage={onPreviousPage}
        onNextPage={onNextPage}
      />
    </div>
  );
}
