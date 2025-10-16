import { useCallback, useState, useRef } from "react";
import { UploadFileInput, uploadObjects, UploadResult } from "../../../lib/api/endpoints";
import { useToast } from "../../../app/toast";
import { isApiError } from "../../../lib/api/endpoints";
import { QueueItem, SessionStats } from "../types";
import { generateId, normalizeRelativePath } from "../utils/fileSystemHelpers";

interface UseFileQueueProps {
  bucket: string;
  prefix: string;
  onCompleted?: (results: UploadResult[]) => void;
  onStatsUpdate: (stats: SessionStats) => void;
}

export function useFileQueue({ bucket, prefix, onCompleted, onStatsUpdate }: UseFileQueueProps) {
  const toast = useToast();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const activeUploads = useRef(0);

  const updateUploadingState = useCallback(() => {
    setIsUploading(activeUploads.current > 0);
  }, []);

  const uploadBatch = useCallback(
    async (items: QueueItem[]) => {
      if (!items.length) {
        return;
      }

      const ids = new Set(items.map((item) => item.id));
      setQueue((prev) =>
        prev.map((item) =>
          ids.has(item.id) ? { ...item, status: "uploading", error: undefined } : item,
        ),
      );

      activeUploads.current += 1;
      updateUploadingState();

      try {
        const payload = await uploadObjects({
          bucket,
          prefix,
          files: items.map((item) => ({ file: item.file, relativePath: item.relativePath })),
        });

        const resultMap = new Map<string, UploadResult>();
        payload.results.forEach((result) => {
          const key = result.relative_path || result.key;
          resultMap.set(key, result);
        });

        onStatsUpdate({
          count: payload.stats.count,
          original: payload.stats.original_bytes,
          stored: payload.stats.stored_bytes,
          savings: payload.stats.savings_bytes,
        });

        setQueue((prev) =>
          prev.map((item) => {
            if (!ids.has(item.id)) {
              return item;
            }
            const result = resultMap.get(item.relativePath);
            if (result) {
              return { ...item, status: "success", result };
            }
            return {
              ...item,
              status: "error",
              error: "Upload completed but response was missing results",
            };
          }),
        );

        if (payload.results.length) {
          const savedBytes = payload.stats.savings_bytes;
          const title = `Uploaded ${payload.stats.count} file${payload.stats.count === 1 ? "" : "s"}`;
          const description = savedBytes ? `Saved ${savedBytes} bytes this batch` : undefined;
          toast.push({ title, description, level: "success" });
        }

        onCompleted?.(payload.results);
      } catch (error) {
        let message: string;
        let title = "Upload failed";
        if (isApiError(error) && error.code === "s3_access_denied") {
          title = "Permission denied";
          message =
            "AWS rejected the upload. This user is missing the required S3 permissions for this bucket.";
        } else if (isApiError(error)) {
          message = error.message;
        } else if (error instanceof Error) {
          message = error.message;
        } else {
          message = String(error);
        }
        setQueue((prev) =>
          prev.map((item) =>
            ids.has(item.id) ? { ...item, status: "error", error: message || "Upload failed" } : item,
          ),
        );
        toast.push({ title, description: message, level: "error" });
      } finally {
        activeUploads.current -= 1;
        updateUploadingState();
      }
    },
    [bucket, prefix, onCompleted, onStatsUpdate, toast, updateUploadingState],
  );

  const addFiles = useCallback(
    (files: UploadFileInput[]) => {
      if (!files.length) {
        return;
      }
      const items = files.map<QueueItem>((entry) => {
        const normalized =
          normalizeRelativePath(entry.relativePath || entry.file.name) || entry.file.name;
        return {
          id: generateId(),
          file: entry.file,
          relativePath: normalized,
          size: entry.file.size,
          status: "pending",
        };
      });
      setQueue((prev) => [...prev, ...items]);

      // Upload in batches of 5 files to avoid overwhelming the browser/server
      const BATCH_SIZE = 5;
      const uploadInBatches = async () => {
        for (let i = 0; i < items.length; i += BATCH_SIZE) {
          const batch = items.slice(i, i + BATCH_SIZE);
          await uploadBatch(batch);
        }
      };
      void uploadInBatches();
    },
    [uploadBatch],
  );

  const clearCompleted = useCallback(() => {
    setQueue((prev) => prev.filter((item) => item.status !== "success"));
  }, []);

  const hasCompleted = queue.some((item) => item.status === "success");

  return {
    queue,
    isUploading,
    hasCompleted,
    addFiles,
    clearCompleted,
  };
}
