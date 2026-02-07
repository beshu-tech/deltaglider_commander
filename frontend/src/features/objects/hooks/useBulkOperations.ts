import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../../app/toast";
import {
  bulkDeleteObjects,
  BULK_DELETE_BATCH_SIZE,
  fetchObjects,
} from "../../../lib/api/endpoints";
import { downloadObject } from "../../../lib/utils/download";
import { qk } from "../../../lib/api/queryKeys";

interface UseBulkOperationsProps {
  bucket: string;
  selectedObjects: string[];
  selectedPrefixes: string[];
  clearSelection: () => void;
  refetchObjects: () => void;
}

export function useBulkOperations({
  bucket,
  selectedObjects,
  selectedPrefixes,
  clearSelection,
  refetchObjects,
}: UseBulkOperationsProps) {
  const toast = useToast();
  const queryClient = useQueryClient();

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

  const handleBulkDownload = useCallback(
    async (totalSelectedCount: number) => {
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
    },
    [bucket, clearSelection, expandSelectedKeys, toast],
  );

  const handleBulkDelete = useCallback(
    async (totalSelectedCount: number) => {
      if (!bucket || totalSelectedCount === 0) {
        return;
      }

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
          toast.update(progressToastId, {
            title: "Delete completed with errors",
            description: `${result.total_deleted} deleted, ${result.total_errors} failed`,
            level: "error",
            autoDismissMs: 7000,
          });

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

      clearSelection();
      refetchObjects();
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
    },
    [bucket, clearSelection, expandSelectedKeys, toast, queryClient, refetchObjects],
  );

  return {
    handleBulkDownload,
    handleBulkDelete,
  };
}
