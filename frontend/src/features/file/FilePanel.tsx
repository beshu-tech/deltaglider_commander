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
  const [downloadLink, setDownloadLink] = useState<string | null>(null);
  const [showLinkFallback, setShowLinkFallback] = useState(false);

  useEffect(() => {
    if (query.error) {
      console.error("Could not load file", query.error);
      toast.push({
        title: "Could not load file",
        description: String(query.error),
        level: "error",
      });
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

  const handleCopy = useCallback(
    async (value: string, field: "key" | "uri" | "link") => {
      try {
        // Check if clipboard API is available
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
          throw new Error("Clipboard API not available. Please use HTTPS or localhost.");
        }

        await navigator.clipboard.writeText(value);
        setCopiedField(field);
        const labels = {
          key: "Object key copied",
          uri: "S3 URI copied",
          link: "Download link copied",
        };
        toast.push({
          title: labels[field],
          description: field === "link" ? "Link ready to share" : undefined,
          level: "success",
        });
        window.setTimeout(() => setCopiedField(null), 1500);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Copy failed", error);
        toast.push({ title: "Copy failed", description: String(error), level: "error" });
      }
    },
    [toast],
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
      const apiUrl = getApiUrl() || window.location.origin;
      const link = `${apiUrl}/api/download/${download_token}`;

      // Try to copy to clipboard
      try {
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
          throw new Error("Clipboard API not available");
        }
        await navigator.clipboard.writeText(link);
        setCopiedField("link");
        toast.push({
          title: "Download link copied",
          description: "Link ready to share",
          level: "success",
        });
        window.setTimeout(() => setCopiedField(null), 1500);
      } catch (clipboardError) {
        // Clipboard failed, show fallback UI
        setDownloadLink(link);
        setShowLinkFallback(true);
        toast.push({
          title: "Clipboard unavailable",
          description: "Link displayed below for manual copy",
          level: "info",
        });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Copy download link failed", error);
      toast.push({ title: "Failed to generate link", description: String(error), level: "error" });
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
            level: "info",
          });
        },
        onCompleted: () => {
          toast.push({ title: "Download ready", description: metadata.key, level: "success" });
        },
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
        <Button
          variant="ghost"
          onClick={onClose}
          aria-label="Close"
          className="text-slate-500 hover:text-slate-900"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Quick actions
        </h3>
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
            data-testid="copy-download-link"
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
            <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
              {copiedField === "uri" ? "Copied" : ""}
            </span>
          </Button>
        </div>

        {/* Fallback UI for manual link copying */}
        {showLinkFallback && downloadLink && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                Manual copy required
              </p>
              <button
                onClick={() => setShowLinkFallback(false)}
                className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                aria-label="Close"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="rounded bg-white p-2 dark:bg-slate-800">
              <input
                type="text"
                value={downloadLink}
                readOnly
                className="w-full select-all border-none bg-transparent text-xs text-slate-700 outline-none dark:text-slate-300"
                onClick={(e) => e.currentTarget.select()}
              />
            </div>
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              Click the link above to select and copy it manually
            </p>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Storage stats
        </h3>
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
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {formatBytes(metadata.original_bytes)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded bg-white/50 px-2 py-1 dark:bg-slate-700/50">
              <span className="text-slate-500 dark:text-slate-400">Stored</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {formatBytes(metadata.stored_bytes)}
              </span>
            </div>
          </div>

          {/* Compression status */}
          <div className="mt-2 text-center">
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                metadata.compressed
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
              }`}
            >
              {metadata.compressed ? "Compressed" : "Original"}
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Object info
        </h3>
        <dl className="space-y-4 text-sm">
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Location
            </dt>
            <dd className="font-medium text-slate-700 dark:text-slate-200 break-words">
              <span className="text-slate-500 dark:text-slate-400">{bucket}/</span>
              {metadata.key}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Last modified
            </dt>
            <dd className="font-medium text-slate-700 dark:text-slate-200">
              {formatDateTime(metadata.modified)}
            </dd>
          </div>
          <div className="space-y-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Accept-Ranges
            </dt>
            <dd className="font-medium text-slate-700 dark:text-slate-200">
              {metadata.accept_ranges ? "Enabled" : "Disabled"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Tags
        </h3>
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
              },
            });
          }}
        >
          {deleteMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Delete object
        </Button>
      </div>
    </aside>
  );
}
