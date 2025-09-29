import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileText, FolderPlus, Loader2, UploadCloud } from "lucide-react";
import { uploadObjects, UploadFileInput, UploadResponse } from "../../lib/api/endpoints";
import { formatBytes } from "../../lib/utils/bytes";
import { useToast } from "../../app/toast";
import { Button } from "../../lib/ui/Button";
import { isApiError } from "../../lib/api/endpoints";

type QueueStatus = "pending" | "uploading" | "success" | "error";

interface QueueItem {
  id: string;
  file: File;
  relativePath: string;
  size: number;
  status: QueueStatus;
  result?: UploadResponse;
  error?: string;
}

interface UploadManagerProps {
  bucket: string;
  prefix: string;
  onCompleted?: (results: UploadResponse[]) => void;
}

interface SessionStats {
  count: number;
  original: number;
  stored: number;
  savings: number;
}

type FileSystemEntry = FileSystemFileEntry | FileSystemDirectoryEntry;

interface FileSystemEntryBase {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
}

interface FileSystemFileEntry extends FileSystemEntryBase {
  isFile: true;
  isDirectory: false;
  file: (callback: (file: File) => void, errorCallback?: (error: DOMException) => void) => void;
}

interface FileSystemDirectoryEntry extends FileSystemEntryBase {
  isFile: false;
  isDirectory: true;
  createReader: () => FileSystemDirectoryReader;
}

interface FileSystemDirectoryReader {
  readEntries: (
    successCallback: (entries: FileSystemEntry[]) => void,
    errorCallback?: (error: DOMException) => void
  ) => void;
}

type DirectoryCapableInput = HTMLInputElement & {
  webkitdirectory?: boolean;
  directory?: boolean;
  mozdirectory?: boolean;
  msdirectory?: boolean;
};

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeRelativePath(path: string): string {
  const sanitized = path.replace(/\\/g, "/");
  const segments = sanitized
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment && segment !== "." && segment !== "..");
  return segments.join("/");
}

async function readFileEntry(entry: FileSystemFileEntry): Promise<UploadFileInput | null> {
  return new Promise((resolve, reject) => {
    entry.file(
      (file) => {
        const relativePath = entry.fullPath.replace(/^\//, "") || file.name;
        try {
          Object.defineProperty(file, "webkitRelativePath", {
            value: relativePath,
            configurable: true
          });
        } catch (error) {
          // Ignore if property is read-only in this environment
        }
        resolve({ file, relativePath });
      },
      (error) => reject(error)
    );
  });
}

async function readDirectoryEntry(entry: FileSystemDirectoryEntry): Promise<UploadFileInput[]> {
  const reader = entry.createReader();
  const collected: UploadFileInput[] = [];

  return new Promise((resolve, reject) => {
    const readBatch = () => {
      reader.readEntries(
        async (entries) => {
          if (!entries.length) {
            resolve(collected);
            return;
          }
          for (const child of entries) {
            try {
              if (child.isFile) {
                const file = await readFileEntry(child as FileSystemFileEntry);
                if (file) {
                  collected.push(file);
                }
              } else if (child.isDirectory) {
                const files = await readDirectoryEntry(child as FileSystemDirectoryEntry);
                collected.push(...files);
              }
            } catch (error) {
              reject(error);
              return;
            }
          }
          readBatch();
        },
        (error) => reject(error)
      );
    };
    readBatch();
  });
}

async function extractDataTransferItems(items: DataTransferItemList): Promise<UploadFileInput[]> {
  const uploads: UploadFileInput[] = [];
  const promises: Promise<UploadFileInput[] | UploadFileInput | null>[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const anyItem = item as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntry | null };
    if (typeof anyItem.webkitGetAsEntry === "function") {
      const entry = anyItem.webkitGetAsEntry();
      if (entry) {
        if (entry.isFile) {
          promises.push(readFileEntry(entry as unknown as FileSystemFileEntry));
        } else if (entry.isDirectory) {
          promises.push(readDirectoryEntry(entry as unknown as FileSystemDirectoryEntry));
        }
        continue;
      }
    }
    const file = item.getAsFile();
    if (file) {
      const withPath = file as File & { webkitRelativePath?: string };
      promises.push(Promise.resolve([{ file, relativePath: withPath.webkitRelativePath || file.name }]));
    }
  }

  const settled = await Promise.all(promises);
  settled.forEach((result) => {
    if (!result) return;
    if (Array.isArray(result)) {
      uploads.push(...result.filter(Boolean) as UploadFileInput[]);
    } else {
      uploads.push(result);
    }
  });

  return uploads;
}

export function UploadManager({ bucket, prefix, onCompleted }: UploadManagerProps) {
  const toast = useToast();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<SessionStats>({ count: 0, original: 0, stored: 0, savings: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const activeUploads = useRef(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = folderInputRef.current as DirectoryCapableInput | null;
    if (!input) {
      return;
    }
    input.setAttribute("webkitdirectory", "");
    input.setAttribute("directory", "");
    input.setAttribute("mozdirectory", "");
    input.setAttribute("msdirectory", "");
    input.webkitdirectory = true;
    if (typeof input.directory !== "undefined") {
      input.directory = true;
    }
    if (typeof input.mozdirectory !== "undefined") {
      input.mozdirectory = true;
    }
    if (typeof input.msdirectory !== "undefined") {
      input.msdirectory = true;
    }
  }, []);

  const normalizedPrefix = useMemo(() => {
    const cleaned = normalizeRelativePath(prefix);
    return cleaned;
  }, [prefix]);

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
          ids.has(item.id)
            ? { ...item, status: "uploading", error: undefined }
            : item
        )
      );

      activeUploads.current += 1;
      updateUploadingState();

      try {
        const payload = await uploadObjects({
          bucket,
          prefix: normalizedPrefix,
          files: items.map((item) => ({ file: item.file, relativePath: item.relativePath }))
        });

        const resultMap = new Map<string, UploadResponse>();
        payload.results.forEach((result) => {
          const key = result.relative_path || result.key;
          resultMap.set(key, result);
        });

        setStats((prev) => ({
          count: prev.count + payload.stats.count,
          original: prev.original + payload.stats.original_bytes,
          stored: prev.stored + payload.stats.stored_bytes,
          savings: prev.savings + payload.stats.savings_bytes
        }));

        setQueue((prev) =>
          prev.map((item) => {
            if (!ids.has(item.id)) {
              return item;
            }
            const result = resultMap.get(item.relativePath) || resultMap.get(item.result?.key ?? "");
            if (result) {
              return { ...item, status: "success", result };
            }
            return {
              ...item,
              status: "error",
              error: "Upload completed but response was missing results"
            };
          })
        );

        if (payload.results.length) {
          const savedBytes = payload.stats.savings_bytes;
          const title = `Uploaded ${payload.stats.count} file${payload.stats.count === 1 ? "" : "s"}`;
          const description = savedBytes
            ? `Saved ${formatBytes(savedBytes)} this batch`
            : undefined;
          toast.push({ title, description, level: "success" });
        }

        onCompleted?.(payload.results);
      } catch (error) {
        const message = isApiError(error)
          ? error.message
          : error instanceof Error
            ? error.message
            : String(error);
        setQueue((prev) =>
          prev.map((item) =>
            ids.has(item.id)
              ? { ...item, status: "error", error: message || "Upload failed" }
              : item
          )
        );
        toast.push({ title: "Upload failed", description: message, level: "error" });
      } finally {
        activeUploads.current -= 1;
        updateUploadingState();
      }
    },
    [bucket, normalizedPrefix, onCompleted, toast, updateUploadingState]
  );

  const addFiles = useCallback(
    (files: UploadFileInput[]) => {
      if (!files.length) {
        return;
      }
      const items = files.map<QueueItem>((entry) => {
        const normalized = normalizeRelativePath(entry.relativePath || entry.file.name) || entry.file.name;
        return {
          id: generateId(),
          file: entry.file,
          relativePath: normalized,
          size: entry.file.size,
          status: "pending"
        };
      });
      setQueue((prev) => [...prev, ...items]);
      void uploadBatch(items);
    },
    [uploadBatch]
  );

  const handleFileSelection = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const list = event.target.files;
      if (!list) {
        return;
      }
      const entries: UploadFileInput[] = Array.from(list).map((file) => {
        const withPath = file as File & { webkitRelativePath?: string };
        return { file, relativePath: withPath.webkitRelativePath || file.name };
      });
      addFiles(entries);
      event.target.value = "";
    },
    [addFiles]
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      if (isUploading) {
        toast.push({
          title: "Upload in progress",
          description: "Please wait for the active upload to finish before adding more files.",
          level: "info"
        });
        return;
      }
      const items = event.dataTransfer.items;
      if (!items) {
        return;
      }
      const uploads = await extractDataTransferItems(items);
      if (uploads.length) {
        addFiles(uploads);
      }
    },
    [addFiles, isUploading, toast]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const clearCompleted = useCallback(() => {
    setQueue((prev) => prev.filter((item) => item.status !== "success"));
  }, []);

  const hasCompleted = queue.some((item) => item.status === "success");

  const savingsPct = stats.original ? (stats.savings / stats.original) * 100 : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100">
        <h2 className="text-sm font-semibold uppercase tracking-wide">Upload Session Statistics</h2>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
          <div>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">Files uploaded</p>
            <p className="text-xl font-semibold">{stats.count}</p>
          </div>
          <div>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">Original size</p>
            <p className="text-base font-medium">{formatBytes(stats.original)}</p>
          </div>
          <div>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">Stored</p>
            <p className="text-base font-medium">{formatBytes(stats.stored)}</p>
          </div>
          <div>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">Space saved</p>
            <p className="text-base font-medium">
              {formatBytes(stats.savings)} ({savingsPct.toFixed(1)}%)
            </p>
          </div>
        </div>
      </section>

      <section>
        <div
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition ${
            isDragging
              ? "border-brand-500 bg-brand-500/10"
              : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelection} />
          <input ref={folderInputRef} type="file" multiple className="hidden" onChange={handleFileSelection} />
          <UploadCloud className="mb-4 h-12 w-12 text-brand-500" />
          <h3 className="text-lg font-semibold">Drag and drop files or folders here</h3>
          <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            We'll automatically organise uploads under
            {normalizedPrefix ? ` ${normalizedPrefix}` : " the bucket root"}. Delta compression is applied when beneficial.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
              <FileText className="h-4 w-4" />
              Select files
            </Button>
            <Button variant="secondary" onClick={() => folderInputRef.current?.click()} className="gap-2">
              <FolderPlus className="h-4 w-4" />
              Select folder
            </Button>
          </div>
          {isUploading ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Upload in progress...
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <header className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Upload Queue ({queue.length})
          </h3>
          <Button variant="ghost" disabled={!hasCompleted} onClick={clearCompleted} className="text-sm">
            Clear completed
          </Button>
        </header>
        <div className="space-y-2">
          {queue.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Files ready for upload will appear here with their compression results.
            </div>
          ) : null}
          {queue.map((item) => {
            const savings = item.result ? item.result.savings_pct : 0;
            let statusIcon = <Loader2 className="h-4 w-4 animate-spin text-slate-400" />;
            let statusText = "Pending";
            let statusColor = "text-slate-500";

            if (item.status === "uploading") {
              statusText = "Uploading";
            } else if (item.status === "success") {
              statusIcon = <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
              statusColor = "text-emerald-600";
              statusText = item.result?.compressed
                ? `Compressed · ${savings.toFixed(1)}% saved`
                : "Stored original";
            } else if (item.status === "error") {
              statusIcon = <AlertCircle className="h-4 w-4 text-rose-500" />;
              statusColor = "text-rose-600";
              statusText = item.error || "Failed";
            }

            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.relativePath}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatBytes(item.size)}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 text-sm ${statusColor}`}>
                  {statusIcon}
                  <span className="max-w-xs truncate text-right">{statusText}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default UploadManager;
