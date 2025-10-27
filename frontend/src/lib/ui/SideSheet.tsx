/**
 * Resizable side sheet component with focus trap
 * Used for both connection panel and object details
 */

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { twMerge } from "tailwind-merge";

interface SideSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width: number;
  onWidthChange: (width: number) => void;
  minWidth?: number;
  maxWidth?: number;
}

export function SideSheet({
  open,
  onClose,
  title,
  children,
  width,
  onWidthChange,
  minWidth = 320, // 20rem
  maxWidth = 768, // 48rem
}: SideSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Focus trap: focus sheet when opened
  useEffect(() => {
    if (open && sheetRef.current) {
      sheetRef.current.focus();
    }
  }, [open]);

  // Handle Escape key to close
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Resize functionality
  useEffect(() => {
    if (!resizeHandleRef.current) return;

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const viewportWidth = window.innerWidth;
      const newWidth = viewportWidth - e.clientX;
      const clampedWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
      onWidthChange(clampedWidth);
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    const handle = resizeHandleRef.current;
    handle.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      handle.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [minWidth, maxWidth, onWidthChange]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={twMerge(
          "fixed right-0 top-0 bottom-0 z-50",
          "bg-white dark:bg-gray-900",
          "border-l border-gray-200 dark:border-gray-800",
          "shadow-xl",
          "flex flex-col",
          "focus:outline-none",
        )}
        style={{ width: `${width}px` }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        tabIndex={-1}
      >
        {/* Resize handle */}
        <div
          ref={resizeHandleRef}
          className={twMerge(
            "absolute left-0 top-0 bottom-0 w-1",
            "cursor-ew-resize",
            "hover:bg-blue-500/20 active:bg-blue-500/30",
            "transition-colors",
          )}
          aria-hidden="true"
        />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 id="sheet-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className={twMerge(
              "p-2 rounded-md",
              "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
              "hover:bg-gray-100 dark:hover:bg-gray-800",
              "transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900",
            )}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}
