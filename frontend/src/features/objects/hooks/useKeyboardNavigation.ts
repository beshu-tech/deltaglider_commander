import { useEffect, useCallback, useRef, useMemo, useState } from "react";
import { ObjectItem } from "../types";
import {
  getLastVisitedKey,
  setLastVisitedKey,
  findItemIndex,
  validateStoredKey,
  shouldIgnoreKeyEvent,
  NavigableItem,
} from "../logic/navigationSelectionLogic";

interface UseKeyboardNavigationProps {
  bucket: string;
  directories: string[];
  objects: ObjectItem[];
  currentPrefix: string;
  onEnterDirectory: (prefix: string) => void;
  onRowClick: (item: ObjectItem) => void;
  onNavigateUp: () => void;
  onNavigateToBuckets?: () => void;
  enabled?: boolean;
}

export interface UseKeyboardNavigationResult {
  containerRef: React.RefObject<HTMLDivElement>;
  focusedKey: string | null;
  isKeyboardMode: boolean;
  setFocusedKey: (key: string | null) => void;
}

/**
 * Keyboard navigation hook for objects table
 *
 * NEW in v2.0:
 * - Uses focusedKey instead of focusedIndex (stable across data changes)
 * - Scoped listener (container, not window)
 * - No wrap-around navigation
 * - isKeyboardMode flag (arrow/enter = true, mouse/input = false)
 * - IME composition detection
 * - Keyboard synonyms: ArrowLeft = Escape, Space = Enter
 * - Arrow keys work in search input to navigate filtered results
 */
export function useKeyboardNavigation({
  bucket,
  directories,
  objects,
  currentPrefix,
  onEnterDirectory,
  onRowClick,
  onNavigateUp,
  onNavigateToBuckets,
  enabled = true,
}: UseKeyboardNavigationProps): UseKeyboardNavigationResult {
  // Core state: focusedKey (stable identifier) instead of index
  const [focusedKey, setFocusedKey] = useState<string | null>(null);

  // Track keyboard vs mouse mode
  const [isKeyboardMode, setIsKeyboardMode] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Build flat list of navigable items (directories first, then objects)
  const allItems = useMemo<NavigableItem[]>(
    () => [
      ...directories.map((prefix) => ({ type: "directory" as const, key: prefix })),
      ...objects.map((obj) => ({ type: "object" as const, key: obj.key })),
    ],
    [directories, objects],
  );

  // Derive index from key at render time (NOT stored in state)
  const focusedIndex = useMemo(() => findItemIndex(allItems, focusedKey), [allItems, focusedKey]);

  // Initialize focus from sessionStorage (when returning to bucket)
  useEffect(() => {
    if (allItems.length === 0) return;

    const storageKey = `lastFocusedObject:${bucket}`;
    const storedKey = getLastVisitedKey(storageKey);

    // Validate that stored key still exists
    const validKey = validateStoredKey(allItems, storedKey);

    if (validKey) {
      setFocusedKey(validKey);
    }
  }, [bucket, allItems]); // Run when bucket or items change

  // Preserve focus when items change (if current item still exists)
  useEffect(() => {
    if (focusedKey === null) return;

    const stillExists = validateStoredKey(allItems, focusedKey);
    if (!stillExists) {
      // Item was deleted/filtered out, clear focus
      setFocusedKey(null);
    }
  }, [allItems, focusedKey]);

  // Reset focus when navigating to different directory
  useEffect(() => {
    setFocusedKey(null);
    setIsKeyboardMode(false); // Also reset keyboard mode
  }, [currentPrefix]);

  // Auto-focus container when enabled and items are available
  // This ensures keyboard navigation works immediately after navigating from sidebar
  useEffect(() => {
    if (!enabled || allItems.length === 0) return;

    const container = containerRef.current;
    if (!container) return;

    // Only focus if no input/textarea/contenteditable has focus
    const activeElement = document.activeElement;
    const isInteractiveElement =
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      (activeElement instanceof HTMLElement && activeElement.isContentEditable);

    if (!isInteractiveElement) {
      // Small delay to ensure page has fully rendered
      const timer = setTimeout(() => {
        container.focus({ preventScroll: true });
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [enabled, allItems.length]);

  // Save focused key to sessionStorage when it changes
  useEffect(() => {
    if (focusedKey !== null) {
      const storageKey = `lastFocusedObject:${bucket}`;
      setLastVisitedKey(storageKey, focusedKey);
    }
  }, [bucket, focusedKey]);

  // Move focus up (no wrap-around)
  const moveFocusUp = useCallback(() => {
    if (allItems.length === 0) return;

    const currentIndex = focusedIndex;

    if (currentIndex <= 0) {
      // At top, do nothing (no wrap-around)
      return;
    }

    const prevKey = allItems[currentIndex - 1].key;
    setFocusedKey(prevKey);
  }, [allItems, focusedIndex]);

  // Move focus down (no wrap-around)
  const moveFocusDown = useCallback(() => {
    if (allItems.length === 0) return;

    const currentIndex = focusedIndex;

    if (currentIndex >= allItems.length - 1) {
      // At bottom, do nothing (no wrap-around)
      return;
    }

    const nextIndex = currentIndex < 0 ? 0 : currentIndex + 1;
    const nextKey = allItems[nextIndex].key;
    setFocusedKey(nextKey);
  }, [allItems, focusedIndex]);

  // Activate currently focused item
  const activateFocusedItem = useCallback(() => {
    if (focusedKey === null) return;

    const item = allItems.find((i) => i.key === focusedKey);
    if (!item) return;

    if (item.type === "directory") {
      onEnterDirectory(item.key);
    } else {
      // Find the full ObjectItem data
      const objectData = objects.find((obj) => obj.key === item.key);
      if (objectData) {
        onRowClick(objectData);
      }
    }
  }, [focusedKey, allItems, objects, onEnterDirectory, onRowClick]);

  // Handle keyboard events (window listener with container check)
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Only handle if container is focused or no other element has focus
      const container = containerRef.current;
      if (!container) return;

      const activeElement = document.activeElement;
      const isContainerFocused = container === activeElement || container.contains(activeElement);

      // Check if we're in a search input (special handling)
      const isSearchInput =
        activeElement instanceof HTMLInputElement &&
        (activeElement.type === "text" || activeElement.type === "search") &&
        (activeElement.placeholder?.toLowerCase().includes("search") ||
          activeElement.getAttribute("aria-label")?.toLowerCase().includes("search"));

      // For arrow keys and Enter/Space/ArrowRight: allow from search input to navigate filtered results
      const isNavigationKey = ["ArrowUp", "ArrowDown", "Enter", " ", "ArrowRight"].includes(
        event.key,
      );

      if (isSearchInput && isNavigationKey) {
        // Allow navigation keys from search input to navigate filtered results
        // User can use arrow keys to navigate the filtered list without leaving search
      } else {
        // For other cases, use normal ignore logic
        if (shouldIgnoreKeyEvent(event)) return;

        // Allow keyboard navigation when container is focused or when focus is on body (default state)
        if (!isContainerFocused && activeElement !== document.body) {
          return;
        }
      }

      let handled = false;

      switch (event.key) {
        case "ArrowDown": {
          event.preventDefault(); // Prevent scrolling
          setIsKeyboardMode(true);
          moveFocusDown();
          handled = true;
          break;
        }

        case "ArrowUp": {
          event.preventDefault(); // Prevent scrolling
          setIsKeyboardMode(true);
          moveFocusUp();
          handled = true;
          break;
        }

        case "Enter":
        case " ": // Space bar is synonym for Enter
        case "ArrowRight": {
          // Right arrow is synonym for Enter
          event.preventDefault();
          setIsKeyboardMode(true);
          activateFocusedItem();
          handled = true;
          break;
        }

        case "Escape":
        case "ArrowLeft": {
          // Left arrow is synonym for Escape
          // Navigate up or back to buckets
          if (currentPrefix) {
            event.preventDefault();
            onNavigateUp();
            handled = true;
          } else if (onNavigateToBuckets) {
            event.preventDefault();
            onNavigateToBuckets();
            handled = true;
          }
          break;
        }
      }

      if (handled) {
        event.stopPropagation();
      }
    },
    [
      enabled,
      currentPrefix,
      onNavigateUp,
      onNavigateToBuckets,
      moveFocusUp,
      moveFocusDown,
      activateFocusedItem,
    ],
  );

  // Handle mouse interactions (clear keyboard mode)
  const handleMouseInteraction = useCallback(() => {
    setIsKeyboardMode(false);
  }, []);

  // Attach keyboard listener to window (with container focus check inside handler)
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown as EventListener);

    return () => {
      window.removeEventListener("keydown", handleKeyDown as EventListener);
    };
  }, [enabled, handleKeyDown]);

  // Attach mouse listeners to container for keyboard mode tracking
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("click", handleMouseInteraction);
    container.addEventListener("mousedown", handleMouseInteraction);

    return () => {
      container.removeEventListener("click", handleMouseInteraction);
      container.removeEventListener("mousedown", handleMouseInteraction);
    };
  }, [handleMouseInteraction]);

  return {
    containerRef,
    focusedKey,
    isKeyboardMode,
    setFocusedKey,
  };
}
