import { useRef, useEffect, useState, useMemo } from "react";
import { Download, Clock, Copy, ChevronDown } from "lucide-react";
import { Button } from "../../../lib/ui/Button";

interface DownloadDropdownProps {
  isOpen: boolean;
  isCopyingLink: boolean;
  copiedField: string | null;
  bucket: string;
  objectKey: string;
  isFocused?: boolean;
  onToggle: () => void;
  onDownload: () => void;
  onCopyS3Uri: () => void;
  onCopyPresignedUrl: (hours: number) => void;
}

export function DownloadDropdown({
  isOpen,
  isCopyingLink,
  copiedField,
  isFocused = false,
  onToggle,
  onDownload,
  onCopyS3Uri,
  onCopyPresignedUrl,
}: DownloadDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [focusedMenuIndex, setFocusedMenuIndex] = useState<number>(-1);

  // Menu items in order - memoized to prevent recreation on every render
  const menuItems = useMemo(
    () => [
      { id: "download", action: onDownload },
      { id: "copy-uri", action: onCopyS3Uri },
      { id: "presigned-24", action: () => onCopyPresignedUrl(24) },
      { id: "presigned-168", action: () => onCopyPresignedUrl(168) },
    ],
    [onDownload, onCopyS3Uri, onCopyPresignedUrl],
  );

  // Reset menu focus when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setFocusedMenuIndex(-1);
    } else {
      // Auto-focus first item when dropdown opens
      setFocusedMenuIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation within dropdown menu
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowDown": {
          event.preventDefault();
          setFocusedMenuIndex((prev) => (prev + 1) % menuItems.length);
          break;
        }
        case "ArrowUp": {
          event.preventDefault();
          setFocusedMenuIndex((prev) => (prev <= 0 ? menuItems.length - 1 : prev - 1));
          break;
        }
        case "Enter":
        case " ": {
          event.preventDefault();
          if (focusedMenuIndex >= 0 && focusedMenuIndex < menuItems.length) {
            menuItems[focusedMenuIndex].action();
          }
          break;
        }
        case "Escape": {
          event.preventDefault();
          onToggle();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, focusedMenuIndex, menuItems, onToggle]);

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
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Download and share options"
        className={`w-full justify-between gap-2 bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 dark:bg-red-700 dark:hover:bg-red-800 dark:focus:ring-red-600 ${
          isFocused ? "ring-2 ring-primary-600 ring-offset-2 dark:ring-primary-500" : ""
        }`}
      >
        <span className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Download & Share
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </Button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute left-0 right-0 z-10 mt-2 rounded-lg border border-ui-border bg-white shadow-lg dark:border-ui-border-dark dark:bg-ui-surface-dark"
        >
          <div className="py-1">
            <button
              role="menuitem"
              onClick={onDownload}
              aria-label="Download object to your computer"
              className={`flex w-full items-center gap-2 px-4 py-2 text-sm text-ui-text hover:bg-ui-surface-active dark:text-ui-text-dark dark:hover:bg-ui-surface-active-dark ${
                focusedMenuIndex === 0
                  ? "bg-primary-100 dark:bg-primary-900/30 ring-2 ring-inset ring-primary-500"
                  : ""
              }`}
            >
              <Download className="h-4 w-4" />
              Download object
            </button>

            <button
              role="menuitem"
              onClick={onCopyS3Uri}
              aria-label="Copy S3 URI to clipboard"
              className={`flex w-full items-center gap-2 px-4 py-2 text-sm text-ui-text hover:bg-ui-surface-active dark:text-ui-text-dark dark:hover:bg-ui-surface-active-dark ${
                focusedMenuIndex === 1
                  ? "bg-primary-100 dark:bg-primary-900/30 ring-2 ring-inset ring-primary-500"
                  : ""
              }`}
            >
              <Copy className="h-4 w-4" />
              Copy S3 URI
              {copiedField === "uri" && (
                <span className="ml-auto text-xs text-ui-text-muted dark:text-ui-text-subtle">
                  Copied
                </span>
              )}
            </button>

            <div
              className="my-1 border-t border-ui-border dark:border-ui-border-dark"
              role="separator"
            />

            <button
              role="menuitem"
              onClick={() => onCopyPresignedUrl(24)}
              disabled={isCopyingLink}
              aria-label="Copy presigned URL valid for 24 hours"
              className={`flex w-full items-center gap-2 px-4 py-2 text-sm text-ui-text hover:bg-ui-surface-active disabled:opacity-50 dark:text-ui-text-dark dark:hover:bg-ui-surface-active-dark ${
                focusedMenuIndex === 2
                  ? "bg-primary-100 dark:bg-primary-900/30 ring-2 ring-inset ring-primary-500"
                  : ""
              }`}
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
              role="menuitem"
              onClick={() => onCopyPresignedUrl(168)}
              disabled={isCopyingLink}
              aria-label="Copy presigned URL valid for 7 days"
              className={`flex w-full items-center gap-2 px-4 py-2 text-sm text-ui-text hover:bg-ui-surface-active disabled:opacity-50 dark:text-ui-text-dark dark:hover:bg-ui-surface-active-dark ${
                focusedMenuIndex === 3
                  ? "bg-primary-100 dark:bg-primary-900/30 ring-2 ring-inset ring-primary-500"
                  : ""
              }`}
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
