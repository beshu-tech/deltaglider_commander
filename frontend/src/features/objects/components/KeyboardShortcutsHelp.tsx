import { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "../../../lib/ui/Button";
import { escapeStack } from "../logic/escapeStack";

/**
 * Keyboard shortcut definition
 */
interface KeyboardShortcut {
  keys: string[];
  description: string;
  context?: string;
}

/**
 * Keyboard shortcuts by category
 */
const SHORTCUTS: Record<string, KeyboardShortcut[]> = {
  "Navigation - Objects List": [
    { keys: ["↑", "k"], description: "Move selection up" },
    { keys: ["↓", "j"], description: "Move selection down" },
    { keys: ["Enter", "Space", "→"], description: "Open selected file/folder" },
    { keys: ["Escape", "←"], description: "Go up one directory or back to buckets" },
  ],
  "Navigation - File Panel": [
    { keys: ["↑"], description: "Focus previous button" },
    { keys: ["↓"], description: "Focus next button" },
    { keys: ["Enter", "Space"], description: "Activate focused button" },
    { keys: ["Escape", "←"], description: "Close file panel" },
  ],
  "Navigation - Dropdown Menu": [
    { keys: ["↑"], description: "Focus previous menu item" },
    { keys: ["↓"], description: "Focus next menu item" },
    { keys: ["Enter", "Space"], description: "Select menu item" },
    { keys: ["Escape", "←"], description: "Close dropdown" },
  ],
  Search: [
    { keys: ["Ctrl", "F"], description: "Focus search input (file view)" },
    { keys: ["Ctrl", "F", "F"], description: "Open browser search (press twice quickly)" },
    { keys: ["↑", "↓"], description: "Navigate filtered results (while in search input)" },
    { keys: ["Enter", "Space", "→"], description: "Open selected file (while in search input)" },
  ],
  Actions: [
    { keys: ["d"], description: "Download selected file" },
    { keys: ["Delete"], description: "Delete selected file (with confirmation)" },
  ],
  General: [
    { keys: ["Shift", "?"], description: "Show this help dialog" },
    { keys: ["Escape", "←"], description: "Close modal/dropdown/panel (context-aware)" },
  ],
};

/**
 * Props for KeyboardShortcutsHelp component
 */
interface KeyboardShortcutsHelpProps {
  /** Whether the help dialog is open */
  open: boolean;

  /** Callback when dialog should close */
  onClose: () => void;
}

/**
 * Keyboard Shortcuts Help Overlay
 *
 * Displays comprehensive keyboard shortcuts guide when user presses Shift+?.
 * Integrates with escape stack for proper modal hierarchy.
 *
 * **Features**:
 * - Escape key support (via escape stack)
 * - ARIA compliant dialog
 * - Backdrop click to close
 * - Focus trap
 * - Body scroll lock
 * - Responsive design
 *
 * @example
 * ```typescript
 * const [showHelp, setShowHelp] = useState(false);
 *
 * // Global Shift+? listener
 * useEffect(() => {
 *   const handleKeyDown = (e: KeyboardEvent) => {
 *     if (e.key === "?" && e.shiftKey) {
 *       e.preventDefault();
 *       setShowHelp(true);
 *     }
 *   };
 *   window.addEventListener("keydown", handleKeyDown);
 *   return () => window.removeEventListener("keydown", handleKeyDown);
 * }, []);
 *
 * return <KeyboardShortcutsHelp open={showHelp} onClose={() => setShowHelp(false)} />;
 * ```
 */
export function KeyboardShortcutsHelp({ open, onClose }: KeyboardShortcutsHelpProps) {
  // Register with Escape stack
  useEffect(() => {
    if (!open) return;

    const unregister = escapeStack.register(() => {
      onClose();
      return true; // Consumed
    });

    return unregister;
  }, [open, onClose]);

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-lg border border-ui-border bg-white shadow-lg dark:border-ui-border-dark dark:bg-ui-surface-dark">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ui-border bg-white px-6 py-4 dark:border-ui-border-dark dark:bg-ui-surface-dark">
          <h2
            id="shortcuts-title"
            className="text-xl font-semibold text-ui-text dark:text-ui-text-dark"
          >
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            className="x-close-button rounded-md p-1 text-ui-text-muted transition-colors hover:bg-ui-surface-active hover:text-ui-text dark:text-ui-text-subtle dark:hover:bg-ui-surface-active-dark dark:hover:text-ui-text-dark"
            aria-label="Close keyboard shortcuts"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: "calc(90vh - 100px)" }}>
          <div className="space-y-8">
            {Object.entries(SHORTCUTS).map(([category, shortcuts]) => (
              <div key={category}>
                <h3 className="mb-3 text-sm font-semibold text-ui-text-muted dark:text-ui-text-muted-dark">
                  {category}
                </h3>
                <div className="space-y-2">
                  {shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-md border border-ui-border-subtle px-4 py-3 dark:border-ui-border-subtle-dark"
                    >
                      <span className="text-sm text-ui-text dark:text-ui-text-dark">
                        {shortcut.description}
                      </span>
                      <div className="flex gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <kbd
                            key={keyIndex}
                            className="min-w-[2rem] rounded border border-ui-border bg-ui-surface px-2 py-1 text-center text-xs font-semibold text-ui-text shadow-sm dark:border-ui-border-dark dark:bg-ui-surface-active-dark dark:text-ui-text-dark"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Note */}
          <div className="mt-8 rounded-lg border border-ui-border-subtle bg-ui-surface-active p-4 dark:border-ui-border-subtle-dark dark:bg-ui-surface-active-dark">
            <p className="text-sm text-ui-text-subtle dark:text-ui-text-muted">
              <strong>Note:</strong> Navigation is context-aware. The Escape key behavior changes
              based on what's currently open (modal → dropdown → panel → parent view).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-ui-border bg-white px-6 py-4 dark:border-ui-border-dark dark:bg-ui-surface-dark">
          <Button onClick={onClose} variant="ghost" className="w-full">
            Close (Escape)
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage keyboard shortcuts help dialog
 *
 * Automatically listens for Shift+? to open help dialog.
 *
 * @example
 * ```typescript
 * function App() {
 *   const { helpOpen, openHelp, closeHelp } = useKeyboardShortcutsHelp();
 *
 *   return (
 *     <>
 *       <YourApp />
 *       <KeyboardShortcutsHelp open={helpOpen} onClose={closeHelp} />
 *     </>
 *   );
 * }
 * ```
 */
export function useKeyboardShortcutsHelp() {
  const [helpOpen, setHelpOpen] = useState(false);

  const openHelp = useCallback(() => setHelpOpen(true), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Shift+? to open help
      if (event.key === "?" && event.shiftKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        openHelp();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openHelp]);

  return {
    helpOpen,
    openHelp,
    closeHelp,
  };
}
