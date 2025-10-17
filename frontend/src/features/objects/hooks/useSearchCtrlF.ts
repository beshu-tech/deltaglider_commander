import { useEffect, useRef } from "react";

export interface UseSearchCtrlFOptions {
  /** Ref to the search input element */
  searchInputRef: React.RefObject<HTMLInputElement>;
  /** Whether Ctrl+F handling is enabled */
  enabled?: boolean;
  /** Callback when Ctrl+F is pressed (before focusing) */
  onCtrlF?: () => void;
}

/**
 * Hook to handle Ctrl+F functionality
 *
 * Features:
 * - Ctrl+F once: Focus search input (and optionally expand search)
 * - Ctrl+F twice (within 500ms): Allow browser search
 *
 * @param options - Configuration options
 */
export function useSearchCtrlF({
  searchInputRef,
  enabled = true,
  onCtrlF,
}: UseSearchCtrlFOptions): void {
  const lastCtrlFTime = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isCtrlF = (event.ctrlKey || event.metaKey) && event.key === "f";
      if (!isCtrlF) return;

      const now = Date.now();
      const timeSinceLastCtrlF = now - lastCtrlFTime.current;

      // Ctrl+F twice within 500ms = browser search
      if (timeSinceLastCtrlF < 500) {
        // Allow browser default search
        lastCtrlFTime.current = 0;
        return;
      }

      // First Ctrl+F = focus our search
      event.preventDefault();
      onCtrlF?.();
      searchInputRef.current?.focus();
      lastCtrlFTime.current = now;
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, searchInputRef, onCtrlF]);
}
