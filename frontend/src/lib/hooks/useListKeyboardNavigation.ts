import { useEffect, useCallback, useRef, useState, RefObject } from "react";

/**
 * Configuration options for keyboard navigation behavior
 */
export interface ListNavigationOptions<T> {
  /** Array of items to navigate through */
  items: T[];
  /** Callback when an item is selected (Enter/ArrowRight) */
  onSelect: (item: T, index: number) => void;
  /** Callback when navigating up/back (ArrowLeft/Escape) */
  onNavigateUp?: () => void;
  /** Function to extract unique key from item */
  getItemKey: (item: T) => string;
  /** Enable/disable keyboard navigation */
  enabled?: boolean;
  /** Custom key handlers for extensibility */
  customKeyHandlers?: Partial<Record<string, (index: number, item: T) => void>>;
}

/**
 * Return type for list keyboard navigation hook
 */
export interface ListNavigationResult {
  /** Ref to attach to the container element */
  containerRef: RefObject<HTMLDivElement>;
  /** Currently focused item index (-1 if none) */
  focusedIndex: number;
  /** Currently focused item key (null if none) */
  focusedItemKey: string | null;
  /** Programmatically focus an item by index */
  focusItem: (index: number) => void;
  /** Reset focus state */
  resetFocus: () => void;
}

/**
 * Generic keyboard navigation hook for list-based interfaces
 *
 * Provides arrow key navigation, selection, and focus management
 * for any list of items following ARIA best practices.
 *
 * @example
 * ```tsx
 * const { containerRef, focusedItemKey } = useListKeyboardNavigation({
 *   items: buckets,
 *   onSelect: (bucket) => navigate(`/buckets/${bucket.name}`),
 *   onNavigateUp: () => navigate('/'),
 *   getItemKey: (bucket) => bucket.name,
 * });
 *
 * return (
 *   <div ref={containerRef}>
 *     {buckets.map(bucket => (
 *       <Row
 *         key={bucket.name}
 *         isFocused={focusedItemKey === bucket.name}
 *       />
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useListKeyboardNavigation<T>({
  items,
  onSelect,
  onNavigateUp,
  getItemKey,
  enabled = true,
  customKeyHandlers = {},
}: ListNavigationOptions<T>): ListNavigationResult {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Get the DOM element for a specific item index
   */
  const getItemElement = useCallback((index: number): HTMLElement | null => {
    if (!containerRef.current) return null;
    const items = containerRef.current.querySelectorAll<HTMLElement>(
      '[role="button"][tabindex="0"]',
    );
    return items[index] || null;
  }, []);

  /**
   * Focus an item by index and update state
   */
  const focusItem = useCallback(
    (index: number) => {
      if (index < 0 || index >= items.length) return;

      const element = getItemElement(index);
      if (element) {
        element.focus();
        setFocusedIndex(index);
      }
    },
    [items.length, getItemElement],
  );

  /**
   * Reset focus state
   */
  const resetFocus = useCallback(() => {
    setFocusedIndex(-1);
  }, []);

  /**
   * Handle keyboard events with proper event delegation
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || items.length === 0) return;

      // Ignore events from input elements
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      let handled = false;

      switch (event.key) {
        case "ArrowDown": {
          event.preventDefault();
          const nextIndex = focusedIndex < 0 ? 0 : (focusedIndex + 1) % items.length;
          focusItem(nextIndex);
          handled = true;
          break;
        }

        case "ArrowUp": {
          event.preventDefault();
          const prevIndex = focusedIndex <= 0 ? items.length - 1 : focusedIndex - 1;
          focusItem(prevIndex);
          handled = true;
          break;
        }

        case "Enter":
        case "ArrowRight": {
          if (focusedIndex >= 0 && focusedIndex < items.length) {
            event.preventDefault();
            onSelect(items[focusedIndex], focusedIndex);
            handled = true;
          }
          break;
        }

        case "Escape":
        case "ArrowLeft": {
          if (onNavigateUp) {
            event.preventDefault();
            onNavigateUp();
            handled = true;
          }
          break;
        }

        default: {
          // Check custom handlers
          const customHandler = customKeyHandlers[event.key];
          if (customHandler && focusedIndex >= 0) {
            event.preventDefault();
            customHandler(focusedIndex, items[focusedIndex]);
            handled = true;
          }
        }
      }

      if (handled) {
        event.stopPropagation();
      }
    },
    [enabled, items, focusedIndex, onSelect, onNavigateUp, focusItem, customKeyHandlers],
  );

  /**
   * Attach keyboard event listener
   */
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  /**
   * Reset focus when items change
   */
  useEffect(() => {
    setFocusedIndex(-1);
  }, [items]);

  return {
    containerRef,
    focusedIndex,
    focusedItemKey:
      focusedIndex >= 0 && focusedIndex < items.length ? getItemKey(items[focusedIndex]) : null,
    focusItem,
    resetFocus,
  };
}
