import { useEffect, useRef, useState, useCallback, RefObject } from "react";

/**
 * Interactive elements within the FilePanel
 */
export type FilePanelElement = "close" | "download-dropdown" | "delete";

/**
 * Options for FilePanel keyboard navigation
 */
interface FilePanelNavigationOptions {
  /** Whether keyboard navigation is enabled */
  enabled?: boolean;
  /** Callback when panel should close (Escape or Left arrow) */
  onClose?: () => void;
  /** Callback when an element is activated */
  onActivate?: (element: FilePanelElement) => void;
}

/**
 * Result of FilePanel navigation hook
 */
interface FilePanelNavigationResult {
  /** Currently focused element */
  focusedElement: FilePanelElement | null;
  /** Ref to attach to the panel container */
  panelRef: RefObject<HTMLElement>;
  /** Function to focus a specific element */
  focusElement: (element: FilePanelElement) => void;
  /** Function to reset focus (unfocus all) */
  resetFocus: () => void;
}

/**
 * Ordered list of focusable elements in the FilePanel
 */
const FOCUSABLE_ELEMENTS: FilePanelElement[] = ["close", "download-dropdown", "delete"];

/**
 * Custom hook for keyboard navigation within FilePanel
 *
 * Provides TUI-style keyboard navigation:
 * - Up/Down: Navigate between interactive elements
 * - Enter: Activate focused element
 * - Escape/Left: Close panel
 *
 * @example
 * ```tsx
 * const { focusedElement, panelRef, focusElement } = useFilePanelNavigation({
 *   enabled: true,
 *   onClose: handleClose,
 *   onActivate: (element) => {
 *     if (element === 'download-dropdown') handleDownload();
 *   },
 * });
 * ```
 */
export function useFilePanelNavigation({
  enabled = true,
  onClose,
  onActivate,
}: FilePanelNavigationOptions = {}): FilePanelNavigationResult {
  const panelRef = useRef<HTMLElement>(null);
  const [focusedElement, setFocusedElement] = useState<FilePanelElement | null>(null);

  const focusElement = useCallback((element: FilePanelElement) => {
    setFocusedElement(element);
  }, []);

  const resetFocus = useCallback(() => {
    setFocusedElement(null);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't intercept if user is typing in an input field
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      // Only handle keys when the panel container or its descendants are focused
      if (!panelRef.current?.contains(document.activeElement)) {
        return;
      }

      let handled = false;

      switch (event.key) {
        case "ArrowDown": {
          event.preventDefault();
          const currentIndex = focusedElement ? FOCUSABLE_ELEMENTS.indexOf(focusedElement) : -1;
          const nextIndex = (currentIndex + 1) % FOCUSABLE_ELEMENTS.length;
          setFocusedElement(FOCUSABLE_ELEMENTS[nextIndex]);
          handled = true;
          break;
        }

        case "ArrowUp": {
          event.preventDefault();
          const currentIndex = focusedElement ? FOCUSABLE_ELEMENTS.indexOf(focusedElement) : -1;
          const prevIndex = currentIndex <= 0 ? FOCUSABLE_ELEMENTS.length - 1 : currentIndex - 1;
          setFocusedElement(FOCUSABLE_ELEMENTS[prevIndex]);
          handled = true;
          break;
        }

        case "Enter":
        case " ": {
          // Activate focused element
          if (focusedElement) {
            event.preventDefault();
            onActivate?.(focusedElement);
            handled = true;
          }
          break;
        }

        case "Escape":
        case "ArrowLeft": {
          event.preventDefault();
          onClose?.();
          handled = true;
          break;
        }
      }

      if (handled) {
        event.stopPropagation();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, focusedElement, onClose, onActivate]);

  // Auto-focus first element when panel is opened
  useEffect(() => {
    if (enabled && focusedElement === null) {
      setFocusedElement(FOCUSABLE_ELEMENTS[0]);
    }
  }, [enabled, focusedElement]);

  return {
    focusedElement,
    panelRef,
    focusElement,
    resetFocus,
  };
}
