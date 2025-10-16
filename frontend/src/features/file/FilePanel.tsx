import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Trash2, X } from "lucide-react";
import { useToast } from "../../app/toast";
import { Button } from "../../lib/ui/Button";
import { formatBytes } from "../../lib/utils/bytes";
import { downloadObject } from "../../lib/utils/download";
import { useDeleteObject } from "./useDeleteObject";
import { useFile } from "./useFile";
import { generatePresignedUrl } from "../../lib/api/endpoints";
import { useSavingsCalculation } from "./hooks/useSavingsCalculation";
import { useCopyToClipboard } from "./hooks/useCopyToClipboard";
import { extractFileName, extractFilePath } from "./utils/metadataFormatters";
import { DownloadDropdown } from "./components/DownloadDropdown";
import { ManualCopyFallback } from "./components/ManualCopyFallback";
import { StorageStatsCard } from "./components/StorageStatsCard";
import {
  ObjectInfoSection,
  S3MetadataSection,
  DeltaGliderMetadataSection,
  CustomMetadataSection,
  TagsSection,
} from "./components/MetadataSections";

interface FilePanelProps {
  bucket: string | null;
  objectKey: string | null;
  onClose?: () => void;
  onDeleted?: (key: string) => void;
  displayMode?: "inline" | "overlay";
}

export function FilePanel({
  bucket,
  objectKey,
  onClose,
  onDeleted,
  displayMode = "inline",
}: FilePanelProps) {
  const toast = useToast();
  const query = useFile(bucket, objectKey);
  const deleteMutation = useDeleteObject(bucket);
  const [isCopyingLink, setIsCopyingLink] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const { copiedField, manualCopyFallback, handleCopyWithFallback, clearFallback } =
    useCopyToClipboard();

  const metadata = query.data;
  const savings = useSavingsCalculation(metadata);
  const fileName = useMemo(() => extractFileName(objectKey), [objectKey]);
  const filePath = useMemo(() => extractFilePath(bucket, objectKey), [bucket, objectKey]);

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

  const handleDownload = useCallback(async () => {
    if (!bucket || !metadata) return;
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
  }, [bucket, metadata, toast]);

  const handleCopyPresignedUrl = useCallback(
    async (expirationHours: number) => {
      if (!bucket || !metadata) return;
      try {
        setIsCopyingLink(true);
        const expiresInSeconds = expirationHours * 3600;
        const presignedUrl = await generatePresignedUrl(bucket, metadata.key, expiresInSeconds);
        const expirationLabel = expirationHours === 24 ? "24 hours" : "1 week";

        await handleCopyWithFallback(presignedUrl.download_url, `presigned-${expirationHours}`, {
          successMessage: `Signed URL copied (valid for ${expirationLabel})`,
          fallbackLabel: `Signed URL (${expirationLabel})`,
          includeDescription: true,
        });
      } catch (error) {
        console.error("Generate presigned URL failed", error);
        toast.push({
          title: "Failed to generate signed URL",
          description: String(error),
          level: "error",
        });
      } finally {
        setIsCopyingLink(false);
      }
    },
    [bucket, metadata, handleCopyWithFallback, toast],
  );

  const handleCopyS3Uri = useCallback(async () => {
    if (!bucket || !metadata) return;
    await handleCopyWithFallback(`s3://${bucket}/${metadata.key}`, "uri", {
      successMessage: "S3 URI copied",
      fallbackLabel: "S3 URI",
    });
    setIsDropdownOpen(false);
  }, [bucket, metadata, handleCopyWithFallback]);

  const handleDownloadClick = useCallback(() => {
    handleDownload();
    setIsDropdownOpen(false);
  }, [handleDownload]);

  const handleDelete = useCallback(() => {
    if (!metadata) return;
    const confirmed = window.confirm(`Delete ${metadata.key}? This cannot be undone.`);
    if (!confirmed) return;
    deleteMutation.mutate(metadata.key, {
      onSuccess: () => {
        onDeleted?.(metadata.key);
      },
    });
  }, [metadata, deleteMutation, onDeleted]);

  if (query.isLoading) {
    return (
      <aside className="flex h-full w-[380px] flex-col items-center justify-center border-l border-ui-border bg-white dark:border-ui-border-dark dark:bg-ui-surface-dark">
        <Loader2 className="h-6 w-6 animate-spin text-ui-text-subtle" />
      </aside>
    );
  }

  if (!metadata || !bucket || !objectKey) {
    return null;
  }

  const isOverlay = displayMode === "overlay";
  const headerPadding = isOverlay ? "p-4 sm:p-5" : "p-4";
  const contentPadding = isOverlay ? "p-4 sm:p-5" : "p-4";
  const footerPadding = isOverlay ? "p-4 sm:p-5" : "p-4";
  const panelClasses = [
    "flex h-full flex-col border-ui-border bg-white shadow-xl transition-transform duration-200 ease-out dark:border-ui-border-dark dark:bg-ui-surface-dark",
    isOverlay
      ? "fixed inset-y-0 right-0 z-50 w-full max-w-[420px] border-l sm:w-[420px]"
      : "w-[380px] border-l",
  ].join(" ");

  const backdrop = isOverlay ? (
    <div
      className="fixed inset-0 z-40 bg-ui-bg-dark/70 backdrop-blur-sm transition-opacity duration-200"
      aria-hidden="true"
      onClick={() => onClose?.()}
    />
  ) : null;

  const panel = (
    <aside
      className={panelClasses}
      role={isOverlay ? "dialog" : undefined}
      aria-modal={isOverlay ? true : undefined}
      aria-label="File details"
    >
      {/* Fixed Header */}
      <div
        className={`flex items-start justify-between gap-2 border-b border-ui-border ${headerPadding} dark:border-ui-border-dark`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-ui-surface-active text-ui-text-muted dark:bg-ui-surface-active-dark dark:text-ui-text-muted-dark">
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1 overflow-x-auto">
            <h2 className="whitespace-nowrap text-base font-semibold text-ui-text dark:text-ui-text-dark">
              {fileName}
            </h2>
            <p className="truncate text-xs text-ui-text-muted dark:text-ui-text-subtle">
              {filePath}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={onClose}
          aria-label="Close panel"
          className="h-8 w-8 flex-shrink-0 p-0 text-ui-text-muted hover:bg-ui-surface-active hover:text-ui-text dark:text-ui-text-subtle dark:hover:bg-ui-surface-active-dark dark:hover:text-ui-text-dark"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Scrollable Content Area */}
      <div className={`flex-1 space-y-4 overflow-y-auto ${contentPadding}`}>
        <DownloadDropdown
          isOpen={isDropdownOpen}
          isCopyingLink={isCopyingLink}
          copiedField={copiedField}
          bucket={bucket}
          objectKey={metadata.key}
          onToggle={() => setIsDropdownOpen(!isDropdownOpen)}
          onDownload={handleDownloadClick}
          onCopyS3Uri={handleCopyS3Uri}
          onCopyPresignedUrl={handleCopyPresignedUrl}
        />

        {manualCopyFallback && (
          <ManualCopyFallback
            value={manualCopyFallback.value}
            label={manualCopyFallback.label}
            onClose={clearFallback}
          />
        )}

        <StorageStatsCard
          savings={savings}
          originalBytes={metadata.original_bytes}
          storedBytes={metadata.stored_bytes}
          compressed={metadata.compressed}
        />

        <ObjectInfoSection modified={metadata.modified} acceptRanges={metadata.accept_ranges} />

        <S3MetadataSection contentType={metadata.content_type} etag={metadata.etag} />

        <DeltaGliderMetadataSection metadata={metadata.metadata} />

        <CustomMetadataSection metadata={metadata.metadata} />

        <TagsSection />
      </div>

      {/* Fixed Footer */}
      <div className={`border-t border-ui-border ${footerPadding} dark:border-ui-border-dark`}>
        <Button
          variant="ghost"
          className="w-full justify-center gap-2 border border-ui-border text-red-600 hover:bg-red-50 focus-visible:outline-red-500 dark:border-ui-border-dark dark:text-red-300 dark:hover:bg-red-900"
          disabled={deleteMutation.isPending}
          onClick={handleDelete}
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
