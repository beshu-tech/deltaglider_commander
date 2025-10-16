import { useRef, useEffect } from "react";
import { Download, Clock, Copy, ChevronDown } from "lucide-react";
import { Button } from "../../../lib/ui/Button";

interface DownloadDropdownProps {
  isOpen: boolean;
  isCopyingLink: boolean;
  copiedField: string | null;
  bucket: string;
  objectKey: string;
  onToggle: () => void;
  onDownload: () => void;
  onCopyS3Uri: () => void;
  onCopyPresignedUrl: (hours: number) => void;
}

export function DownloadDropdown({
  isOpen,
  isCopyingLink,
  copiedField,
  onToggle,
  onDownload,
  onCopyS3Uri,
  onCopyPresignedUrl,
}: DownloadDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onToggle();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onToggle]);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        onClick={onToggle}
        className="w-full justify-between gap-2 bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 dark:bg-red-700 dark:hover:bg-red-800 dark:focus:ring-red-600"
      >
        <span className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Download & Share
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </Button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-10 mt-2 rounded-lg border border-ui-border bg-white shadow-lg dark:border-ui-border-dark dark:bg-ui-surface-dark">
          <div className="py-1">
            <button
              onClick={onDownload}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-ui-text hover:bg-ui-surface-active dark:text-ui-text-dark dark:hover:bg-ui-surface-active-dark"
            >
              <Download className="h-4 w-4" />
              Download object
            </button>

            <button
              onClick={onCopyS3Uri}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-ui-text hover:bg-ui-surface-active dark:text-ui-text-dark dark:hover:bg-ui-surface-active-dark"
            >
              <Copy className="h-4 w-4" />
              Copy S3 URI
              {copiedField === "uri" && (
                <span className="ml-auto text-xs text-ui-text-muted dark:text-ui-text-subtle">
                  Copied
                </span>
              )}
            </button>

            <div className="my-1 border-t border-ui-border dark:border-ui-border-dark" />

            <button
              onClick={() => onCopyPresignedUrl(24)}
              disabled={isCopyingLink}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-ui-text hover:bg-ui-surface-active disabled:opacity-50 dark:text-ui-text-dark dark:hover:bg-ui-surface-active-dark"
            >
              <Clock className="h-4 w-4" />
              Share signed URL (24h)
              {copiedField === "presigned-24" && (
                <span className="ml-auto text-xs text-ui-text-muted dark:text-ui-text-subtle">
                  Copied
                </span>
              )}
            </button>

            <button
              onClick={() => onCopyPresignedUrl(168)}
              disabled={isCopyingLink}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-ui-text hover:bg-ui-surface-active disabled:opacity-50 dark:text-ui-text-dark dark:hover:bg-ui-surface-active-dark"
            >
              <Clock className="h-4 w-4" />
              Share signed URL (1w)
              {copiedField === "presigned-168" && (
                <span className="ml-auto text-xs text-ui-text-muted dark:text-ui-text-subtle">
                  Copied
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
