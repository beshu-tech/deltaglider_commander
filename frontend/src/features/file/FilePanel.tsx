import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, FileText, Loader2, Share2, Tag, Trash2, X } from "lucide-react";
import { useToast } from "../../app/toast";
import { Button } from "../../lib/ui/Button";
import { formatBytes } from "../../lib/utils/bytes";
import { formatDateTime } from "../../lib/utils/dates";
import { downloadObject } from "../../lib/utils/download";
import { useDeleteObject } from "./useDeleteObject";
import { useFile } from "./useFile";
import { prepareDownload } from "../../lib/api/endpoints";
import { getApiUrl } from "../../lib/config/env";

interface FilePanelProps {
  bucket: string | null;
  objectKey: string | null;
  onClose?: () => void;
  onDeleted?: (key: string) => void;
}

export function FilePanel({ bucket, objectKey, onClose, onDeleted }: FilePanelProps) {
  const toast = useToast();
  const [copiedField, setCopiedField] = useState<"key" | "uri" | "link" | null>(null);
  const query = useFile(bucket, objectKey);
  const deleteMutation = useDeleteObject(bucket);
  const [isCopyingLink, setIsCopyingLink] = useState(false);

  useEffect(() => {
    if (query.error) {
      toast.push({ title: "Could not load file", description: String(query.error), level: "error" });
    }
  }, [query.error, toast]);

  const metadata = query.data;
  const savings = useMemo(() => {
    if (!metadata) return { bytes: 0, pct: 0 };
    const bytes = metadata.original_bytes - metadata.stored_bytes;
    const pct = metadata.original_bytes === 0 ? 0 : (bytes / metadata.original_bytes) * 100;
    return { bytes, pct };
  }, [metadata]);

  const fileName = useMemo(() => {
    if (!objectKey) return "";
    const parts = objectKey.split("/");
    return parts[parts.length - 1] || objectKey;
  }, [objectKey]);

  const parentPath = useMemo(() => {
    if (!objectKey) return "";
    const index = objectKey.lastIndexOf("/");
    return index >= 0 ? objectKey.slice(0, index + 1) : "";
  }, [objectKey]);

  const handleCopy = useCallback(
    async (value: string, field: "key" | "uri" | "link") => {
      try {
        await navigator.clipboard.writeText(value);
        setCopiedField(field);
        toast.push({ title: "Copied", description: value, level: "success" });
        window.setTimeout(() => setCopiedField(null), 1500);
      } catch (error) {
        toast.push({ title: "Copy failed", description: String(error), level: "error" });
      }
    },
    [toast]
  );

  if (query.isLoading) {
    return (
      <aside className="flex h-full w-[380px] flex-col items-center justify-center border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </aside>
    );
  }

  if (!metadata) {
    return null;
  }

  if (!bucket || !objectKey) {
    return null;
  }

  const handleCopyDownloadLink = async () => {
    try {
      setIsCopyingLink(true);
      const { download_token } = await prepareDownload(bucket, metadata.key);
      const link = `${getApiUrl()}/api/download/${download_token}`;
      await handleCopy(link, "link");
    } catch (error) {
      toast.push({ title: "Copy failed", description: String(error), level: "error" });
    } finally {
      setIsCopyingLink(false);
    }
  };

  const handleDownload = async () => {
    try {
      await downloadObject(bucket, metadata.key, {
        onPrepared: (estimated) => {
          toast.push({
            title: "Preparing download",
            description: `${formatBytes(estimated)} expected`,
            level: "info"
          });
        },
        onCompleted: () => {
          toast.push({ title: "Download ready", description: metadata.key, level: "success" });
        }
      });
    } catch (error) {
      toast.push({ title: "Download failed", description: String(error), level: "error" });
    }
  };

  return (
    <aside className="flex h-full w-[380px] flex-col gap-5 border-l border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{fileName}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{metadata.key}</p>
          </div>
        </div>
        <Button variant="ghost" onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-900">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Quick actions</h3>
        <div className="grid gap-2">
          <Button className="justify-start gap-2" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            Download object
          </Button>
          <Button
            variant="secondary"
            className="justify-start gap-2"
            onClick={handleCopyDownloadLink}
            disabled={isCopyingLink}
          >
            <ExternalLink className="h-4 w-4" />
            Copy download link
            <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
              {copiedField === "link" ? "Copied" : ""}
            </span>
          </Button>
          <Button
            variant="ghost"
            className="justify-start gap-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={() => handleCopy(`s3://${bucket}/${metadata.key}`, "uri")}
          >
            <Share2 className="h-4 w-4" />
            Copy S3 URI
            <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">{copiedField === "uri" ? "Copied" : ""}</span>
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Storage stats</h3>
        <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
          {/* Main savings highlight */}
          <div className="mb-3 text-center">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {savings.pct.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {formatBytes(savings.bytes)} saved
            </div>
          </div>

          {/* Compact stats grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center justify-between rounded bg-white/50 px-2 py-1 dark:bg-slate-700/50">
              <span className="text-slate-500 dark:text-slate-400">Original</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{formatBytes(metadata.original_bytes)}</span>
            </div>
            <div className="flex items-center justify-between rounded bg-white/50 px-2 py-1 dark:bg-slate-700/50">
              <span className="text-slate-500 dark:text-slate-400">Stored</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{formatBytes(metadata.stored_bytes)}</span>
            </div>
          </div>

          {/* Compression status */}
          <div className="mt-2 text-center">
            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
              metadata.compressed
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
            }`}>
              {metadata.compressed ? "Compressed" : "Original"}
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Object info</h3>
        <dl className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          {parentPath ? (
            <div>
              <dt className="text-xs uppercase text-slate-400">Folder</dt>
              <dd className="font-medium">{parentPath}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs uppercase text-slate-400">Bucket</dt>
            <dd className="font-medium">{bucket}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-400">Key</dt>
            <dd className="font-medium break-words">{metadata.key}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-400">Last modified</dt>
            <dd className="font-medium">{formatDateTime(metadata.modified)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-400">Accept-Ranges</dt>
            <dd className="font-medium">{metadata.accept_ranges ? "Enabled" : "Disabled"}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tags</h3>
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 p-3 text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
          <Tag className="h-4 w-4" />
          No tags available
        </div>
      </section>

      <div className="mt-auto">
        <Button
          variant="ghost"
          className="w-full justify-center gap-2 border border-slate-200 text-red-600 hover:bg-red-50 focus-visible:outline-red-500 dark:border-slate-700 dark:text-red-300 dark:hover:bg-red-900"
          disabled={deleteMutation.isPending}
          onClick={() => {
            const confirmed = window.confirm(`Delete ${metadata.key}? This cannot be undone.`);
            if (!confirmed) return;
            deleteMutation.mutate(metadata.key, {
              onSuccess: () => {
                onDeleted?.(metadata.key);
              }
            });
          }}
        >
          {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Delete object
        </Button>
      </div>
    </aside>
  );
}
