import { X } from "lucide-react";

interface ManualCopyFallbackProps {
  value: string;
  label: string;
  onClose: () => void;
}

export function ManualCopyFallback({ value, label, onClose }: ManualCopyFallbackProps) {
  return (
    <div className="rounded-lg border border-ui-border bg-ui-surface-active p-2 dark:border-ui-border-dark dark:bg-ui-surface-active-dark">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-medium text-ui-text dark:text-ui-text-dark">
          Manual copy: {label}
        </p>
        <button
          onClick={onClose}
          className="text-ui-text-muted transition-colors hover:text-ui-text dark:text-ui-text-muted-dark dark:hover:text-ui-text-dark"
          aria-label="Close"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="rounded bg-white p-1 dark:bg-ui-surface-active-dark">
        <input
          type="text"
          value={value}
          readOnly
          className="w-full select-all border-none bg-transparent text-xs text-ui-text outline-none dark:text-ui-text-muted-dark"
          onClick={(e) => e.currentTarget.select()}
          autoFocus
        />
      </div>
      <p className="mt-1 text-xs text-ui-text-muted dark:text-ui-text-muted-dark">
        Click to select and copy manually
      </p>
    </div>
  );
}
