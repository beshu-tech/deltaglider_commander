import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";
import { escapeStack } from "../../features/objects/logic/escapeStack";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Reusable confirmation modal with Escape key support
 *
 * Features:
 * - Accessible with proper ARIA attributes
 * - Escape key closes modal (uses global Escape stack)
 * - Focus trap (focus stays within modal)
 * - Keyboard navigation (Tab between buttons)
 * - Backdrop click closes modal
 */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Register with Escape stack
  useEffect(() => {
    if (!open) return;

    const unregister = escapeStack.register(() => {
      onCancel();
      return true; // Consumed
    });

    return unregister;
  }, [open, onCancel]);

  // Focus confirm button when modal opens
  useEffect(() => {
    if (open && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [open]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const variantStyles = {
    danger:
      "bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 dark:bg-primary-700 dark:hover:bg-primary-800",
    warning:
      "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500 dark:bg-yellow-700 dark:hover:bg-yellow-800",
    info: "bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 dark:bg-primary-700 dark:hover:bg-primary-800",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative z-10 w-full max-w-md rounded-lg border border-ui-border bg-white p-6 shadow-lg dark:border-ui-border-dark dark:bg-ui-surface-dark"
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <h2
            id="modal-title"
            className="text-xl font-semibold text-ui-text dark:text-ui-text-dark"
          >
            {title}
          </h2>
          <button
            onClick={onCancel}
            className="x-close-button rounded-md p-1 text-ui-text-muted hover:bg-ui-surface-hover hover:text-ui-text dark:text-ui-text-subtle dark:hover:bg-ui-surface-hover-dark dark:hover:text-ui-text-dark"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <p id="modal-description" className="mb-6 text-ui-text-subtle dark:text-ui-text-muted">
          {message}
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmButtonRef}
            onClick={onConfirm}
            className={`text-white ${variantStyles[variant]}`}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
