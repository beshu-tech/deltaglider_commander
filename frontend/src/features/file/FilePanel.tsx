import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  AlertTriangle,
  Download,
  FileText,
  Loader2,
  Tag,
  Trash2,
  X,
  ChevronDown,
  Clock,
  Copy,
} from "lucide-react";
import { useToast } from "../../app/toast";
import { Button } from "../../lib/ui/Button";
import { formatBytes } from "../../lib/utils/bytes";
import { formatDateTime } from "../../lib/utils/dates";
import { downloadObject } from "../../lib/utils/download";
import { useDeleteObject } from "./useDeleteObject";
import { useFile } from "./useFile";
import { generatePresignedUrl } from "../../lib/api/endpoints";

interface FilePanelProps {
  bucket: string | null;
  objectKey: string | null;
  onClose?: () => void;
  onDeleted?: (key: string) => void;
  displayMode?: "inline" | "overlay";
}

interface ManualCopyFallback {
  value: string;
  label: string;
}

export function FilePanel({
  bucket,
  objectKey,
  onClose,
  onDeleted,
  displayMode = "inline",
}: FilePanelProps) {
  const toast = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const query = useFile(bucket, objectKey);
  const deleteMutation = useDeleteObject(bucket);
  const [isCopyingLink, setIsCopyingLink] = useState(false);
  const [manualCopyFallback, setManualCopyFallback] = useState<ManualCopyFallback | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Format deltaglider metadata values for better readability
  const formatMetadataValue = (key: string, value: string): string => {
    // Format dates
    if ((key === "dg-created-at" || key === "dg-expires-at") && value.includes("T")) {
      return formatDateTime(value);
    }
    // Format file sizes
    if ((key === "dg-file-size" || key === "dg-delta-size") && /^\d+$/.test(value)) {
      return formatBytes(parseInt(value, 10));
    }
    // Truncate long hashes
    if ((key.includes("sha256") || key === "dg-etag") && value.length > 32) {
      return `${value.substring(0, 12)}...${value.substring(value.length - 12)}`;
    }
    return value;
  };

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const metadata = query.data;
  const savings = useMemo(() => {
    if (!metadata) return { bytes: 0, pct: 0, isGrowth: false };
    const diff = metadata.original_bytes - metadata.stored_bytes;
    const absBytes = Math.abs(diff);
    const pct = metadata.original_bytes === 0 ? 0 : (absBytes / metadata.original_bytes) * 100;
    return { bytes: absBytes, pct, isGrowth: diff < 0 };
  }, [metadata]);

  const fileName = useMemo(() => {
    if (!objectKey) return "";
    const parts = objectKey.split("/");
    return parts[parts.length - 1] || objectKey;
  }, [objectKey]);

  const filePath = useMemo(() => {
    if (!objectKey || !objectKey.includes("/")) return bucket || "";
    const pathParts = objectKey.split("/");
    pathParts.pop(); // Remove filename
    return `${bucket}/${pathParts.join("/")}`;
  }, [bucket, objectKey]);

  // Generic copy handler with fallback support
  const handleCopyWithFallback = useCallback(
    async (value: string, fieldId: string, successMessage: string, fallbackLabel: string) => {
      try {
        // Check if clipboard API is available
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
          throw new Error("Clipboard API not available");
        }

        await navigator.clipboard.writeText(value);
        setCopiedField(fieldId);
        toast.push({
          title: successMessage,
          description: fieldId === "link" ? "Link ready to share" : undefined,
          level: "success",
        });
        window.setTimeout(() => setCopiedField(null), 1500);
      } catch (error) {
        // Show manual copy fallback
        setManualCopyFallback({ value, label: fallbackLabel });
        toast.push({
          title: "Clipboard unavailable",
          description: "Use the manual copy option below",
          level: "info",
        });
      }
    },
    [toast],
  );

  // Legacy wrapper for existing code
  const handleCopy = useCallback(
    async (value: string, field: "key" | "uri" | "link") => {
      const labels = {
        key: "Object key copied",
        uri: "S3 URI copied",
        link: "Download link copied",
      };
      const fallbackLabels = {
        key: "Object key",
        uri: "S3 URI",
        link: "Download link",
      };
      await handleCopyWithFallback(value, field, labels[field], fallbackLabels[field]);
    },
    [handleCopyWithFallback],
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

  const isOverlay = displayMode === "overlay";
  const headerPadding = isOverlay ? "p-4 sm:p-5" : "p-4";
  const contentPadding = isOverlay ? "p-4 sm:p-5" : "p-4";
  const footerPadding = isOverlay ? "p-4 sm:p-5" : "p-4";
  const panelClasses = [
    "flex h-full flex-col border-slate-200 bg-white shadow-xl transition-transform duration-200 ease-out dark:border-slate-800 dark:bg-slate-900",
    isOverlay
      ? "fixed inset-y-0 right-0 z-50 w-full max-w-[420px] border-l sm:w-[420px]"
      : "w-[380px] border-l",
  ].join(" ");
  const backdrop = isOverlay ? (
    <div
      className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-200"
      aria-hidden="true"
      onClick={() => onClose?.()}
    />
  ) : null;

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

  // Generate and copy presigned URL with custom expiration
  const handleCopyPresignedUrl = async (expirationHours: number) => {
    try {
      setIsCopyingLink(true);

      // Convert hours to seconds for the API
      const expiresInSeconds = expirationHours * 3600;
      const presignedUrl = await generatePresignedUrl(bucket, metadata.key, expiresInSeconds);
      const link = presignedUrl.download_url;

      const expirationLabel = expirationHours === 24 ? "24 hours" : "1 week";

      await handleCopyWithFallback(
        link,
        `presigned-${expirationHours}`,
        `Signed URL copied (valid for ${expirationLabel})`,
        `Signed URL (${expirationLabel})`,
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Generate presigned URL failed", error);
      toast.push({
        title: "Failed to generate signed URL",
        description: String(error),
        level: "error",
      });
    } finally {
      setIsCopyingLink(false);
    }
  };

  const panel = (
    <aside
      className={panelClasses}
      role={isOverlay ? "dialog" : undefined}
      aria-modal={isOverlay ? true : undefined}
      aria-label="File details"
    >
      {/* Fixed Header */}
      <div
        className={`flex items-start justify-between border-b border-slate-200 ${headerPadding} dark:border-slate-800`}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
              {fileName}
            </h2>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{filePath}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={onClose}
          aria-label="Close panel"
          className="h-8 w-8 flex-shrink-0 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Scrollable Content Area */}
      <div className={`flex-1 space-y-4 overflow-y-auto ${contentPadding}`}>
        {/* Dropdown Action Button */}
        <div className="relative" ref={dropdownRef}>
          <Button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full justify-between gap-2 bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 dark:bg-red-700 dark:hover:bg-red-800 dark:focus:ring-red-600"
          >
            <span className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download & Share
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
            />
          </Button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute left-0 right-0 z-10 mt-2 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <div className="py-1">
                <button
                  onClick={() => {
                    handleDownload();
                    setIsDropdownOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Download className="h-4 w-4" />
                  Download object
                </button>

                <button
                  onClick={() => {
                    handleCopy(`s3://${bucket}/${metadata.key}`, "uri");
                    setIsDropdownOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Copy className="h-4 w-4" />
                  Copy S3 URI
                  {copiedField === "uri" && (
                    <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                      Copied
                    </span>
                  )}
                </button>

                <div className="my-1 border-t border-slate-200 dark:border-slate-700" />

                <button
                  onClick={() => {
                    handleCopyPresignedUrl(24);
                    setIsDropdownOpen(false);
                  }}
                  disabled={isCopyingLink}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Clock className="h-4 w-4" />
                  Share signed URL (24h)
                  {copiedField === "presigned-24" && (
                    <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                      Copied
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    handleCopyPresignedUrl(168); // 1 week = 168 hours
                    setIsDropdownOpen(false);
                  }}
                  disabled={isCopyingLink}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Clock className="h-4 w-4" />
                  Share signed URL (1w)
                  {copiedField === "presigned-168" && (
                    <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                      Copied
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Generic Manual Copy Fallback UI */}
        {manualCopyFallback && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 dark:border-amber-800 dark:bg-amber-950">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                Manual copy: {manualCopyFallback.label}
              </p>
              <button
                onClick={() => setManualCopyFallback(null)}
                className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                aria-label="Close"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="rounded bg-white p-1 dark:bg-slate-800">
              <input
                type="text"
                value={manualCopyFallback.value}
                readOnly
                className="w-full select-all border-none bg-transparent text-xs text-slate-700 outline-none dark:text-slate-300"
                onClick={(e) => e.currentTarget.select()}
                autoFocus
              />
            </div>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Click to select and copy manually
            </p>
          </div>
        )}

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Storage stats
          </h3>
          <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-3 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
            {/* Main savings highlight */}
            <div className="mb-3 text-center">
              <div className="mb-1 inline-flex items-center justify-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {savings.isGrowth ? (
                  <>
                    <AlertTriangle
                      className="h-3 w-3 text-amber-500 dark:text-amber-300"
                      aria-hidden="true"
                    />
                    Growth
                  </>
                ) : (
                  "Savings"
                )}
              </div>
              <div
                className={`text-3xl font-bold ${
                  savings.isGrowth
                    ? "text-rose-600 dark:text-rose-300"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {savings.pct.toFixed(1)}%
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {formatBytes(savings.bytes)} {savings.isGrowth ? "growth" : "saved"}
              </div>
            </div>

            {savings.isGrowth ? (
              <div className="mb-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-left text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
                <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" aria-hidden="true" />
                <div className="space-y-0.5">
                  <p className="font-semibold">Delta increased this object</p>
                  <p className="text-xs">
                    The stored delta ({formatBytes(metadata.stored_bytes)}) is larger than the
                    original ({formatBytes(metadata.original_bytes)}). Re-upload without delta
                    compression or refresh the reference to restore savings.
                  </p>
                </div>
              </div>
            ) : null}

            {/* Compact stats grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
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
            <div className="mt-1 text-center">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
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

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Object info
          </h3>
          <dl className="space-y-2 text-xs">
            <div className="rounded bg-slate-50 p-2 dark:bg-slate-800">
              <dt className="font-medium text-slate-600 dark:text-slate-400">Last modified</dt>
              <dd className="mt-0.5 text-slate-700 dark:text-slate-200">
                {formatDateTime(metadata.modified)}
              </dd>
            </div>
            <div className="rounded bg-slate-50 p-2 dark:bg-slate-800">
              <dt className="font-medium text-slate-600 dark:text-slate-400">Accept-Ranges</dt>
              <dd className="mt-0.5 text-slate-700 dark:text-slate-200">
                {metadata.accept_ranges ? "Enabled" : "Disabled"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            S3 Metadata
          </h3>
          <dl className="space-y-1 text-xs">
            {metadata.content_type && (
              <div className="rounded bg-slate-50 p-2 dark:bg-slate-800">
                <dt className="font-medium text-slate-600 dark:text-slate-400">Content-Type</dt>
                <dd className="mt-0.5 font-mono text-slate-700 dark:text-slate-200">
                  {metadata.content_type}
                </dd>
              </div>
            )}
            {metadata.etag && (
              <div className="rounded bg-slate-50 p-2 dark:bg-slate-800">
                <dt className="font-medium text-slate-600 dark:text-slate-400">ETag</dt>
                <dd className="mt-0.5 break-all font-mono text-slate-700 dark:text-slate-200">
                  {metadata.etag}
                </dd>
              </div>
            )}
          </dl>
        </section>

        {/* DeltaGlider Metadata Section */}
        {(() => {
          const dgMetadata = metadata.metadata
            ? Object.entries(metadata.metadata).filter(([key]) => key.startsWith("dg-"))
            : [];

          return dgMetadata.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                DeltaGlider Metadata
              </h3>
              <dl className="space-y-1 text-xs">
                {dgMetadata.map(([key, value]) => {
                  const displayKey = key.replace("dg-", "").replace(/-/g, " ");
                  const formattedValue = formatMetadataValue(key, value);
                  const isLongValue = formattedValue.length > 60;
                  const isCommand = key === "dg-delta-cmd";

                  return (
                    <div key={key} className="rounded bg-slate-50 p-2 dark:bg-slate-800">
                      <dt className="font-medium capitalize text-slate-600 dark:text-slate-400">
                        {displayKey}
                      </dt>
                      <dd
                        className={`mt-0.5 text-slate-700 dark:text-slate-200 ${!key.includes("size") && !key.includes("created") ? "font-mono text-xs" : ""}`}
                      >
                        {isCommand || isLongValue ? (
                          <details className="cursor-pointer">
                            <summary className="select-none hover:underline">
                              {isCommand ? "Show command" : formattedValue}
                            </summary>
                            <div className="mt-1 break-all text-xs">{value}</div>
                          </details>
                        ) : (
                          formattedValue
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          ) : null;
        })()}

        {/* Custom Metadata Section */}
        {(() => {
          const customMetadata = metadata.metadata
            ? Object.entries(metadata.metadata).filter(([key]) => !key.startsWith("dg-"))
            : [];

          return (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Custom Metadata
              </h3>
              {customMetadata.length > 0 ? (
                <dl className="space-y-1 text-xs">
                  {customMetadata.map(([key, value]) => (
                    <div key={key} className="rounded bg-slate-50 p-2 dark:bg-slate-800">
                      <dt className="font-medium text-slate-600 dark:text-slate-400">{key}</dt>
                      <dd className="mt-0.5 break-all font-mono text-slate-700 dark:text-slate-200">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 p-2 text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  <Tag className="h-3 w-3" />
                  No custom metadata
                </div>
              )}
            </section>
          );
        })()}

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Tags
          </h3>
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 p-2 text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
            <Tag className="h-3 w-3" />
            No tags available
          </div>
        </section>
      </div>

      {/* Fixed Footer */}
      <div className={`border-t border-slate-200 ${footerPadding} dark:border-slate-800`}>
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

  return isOverlay ? (
    <>
      {backdrop}
      {panel}
    </>
  ) : (
    panel
  );
}
