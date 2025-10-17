/**
 * Virtual List API for Future Virtualization Support
 *
 * This module defines the API contract for virtual scrolling with keyboard navigation.
 * Currently a placeholder/documentation for future implementation when lists grow large.
 *
 * **Status**: API Definition Only (No Implementation Yet)
 * **Purpose**: Ensure keyboard navigation works with virtualized lists
 * **Trigger**: Implement when object lists exceed ~1000 items
 *
 * @example
 * ```typescript
 * const virtualList = useVirtualList({
 *   items,
 *   estimatedItemHeight: 48,
 *   overscan: 5,
 * });
 *
 * // Keyboard navigation calls this
 * virtualList.scrollToKey("file-123.txt");
 * ```
 */

/**
 * Configuration for virtual list
 */
export interface VirtualListConfig {
  /** Total number of items */
  itemCount: number;

  /** Estimated height of each item in pixels */
  estimatedItemHeight: number;

  /** Number of items to render outside viewport (for smooth scrolling) */
  overscan?: number;

  /** Container height in pixels */
  containerHeight?: number;

  /** Get unique key for item at index */
  getItemKey: (index: number) => string;

  /** Optional: Custom scroll behavior */
  scrollBehavior?: "auto" | "smooth";
}

/**
 * Virtual list state and methods
 */
export interface VirtualListMethods {
  /**
   * Scroll to item by key (for keyboard navigation)
   *
   * This is the critical method for keyboard navigation integration.
   * It ensures focused items are always visible in the viewport.
   *
   * @param key - Unique item key
   * @param options - Scroll options
   * @returns true if item found and scrolled, false otherwise
   *
   * @example
   * ```typescript
   * // Keyboard navigation focuses item
   * setFocusedKey("file-123.txt");
   *
   * // Ensure it's visible
   * virtualList.scrollToKey("file-123.txt", { align: "center" });
   * ```
   */
  scrollToKey(key: string, options?: ScrollToKeyOptions): boolean;

  /**
   * Scroll to item by index
   *
   * @param index - Item index
   * @param options - Scroll options
   */
  scrollToIndex(index: number, options?: ScrollToIndexOptions): void;

  /**
   * Get currently visible range
   *
   * @returns Start and end indices of visible items
   */
  getVisibleRange(): { startIndex: number; endIndex: number };

  /**
   * Check if item is currently visible
   *
   * @param key - Item key
   * @returns true if item is in viewport
   */
  isVisible(key: string): boolean;

  /**
   * Force recalculation of item positions
   * Call this when item heights change dynamically
   */
  recalculate(): void;
}

/**
 * Options for scrollToKey
 */
export interface ScrollToKeyOptions {
  /**
   * Alignment in viewport
   * - "start": Align to top of viewport
   * - "center": Center in viewport (default for keyboard nav)
   * - "end": Align to bottom of viewport
   * - "auto": Minimal scroll to make visible
   */
  align?: "start" | "center" | "end" | "auto";

  /**
   * Scroll behavior
   * - "auto": Instant scroll (default for keyboard nav)
   * - "smooth": Animated scroll
   */
  behavior?: "auto" | "smooth";

  /**
   * Offset from target position in pixels
   */
  offset?: number;
}

/**
 * Options for scrollToIndex
 */
export interface ScrollToIndexOptions {
  align?: "start" | "center" | "end" | "auto";
  behavior?: "auto" | "smooth";
  offset?: number;
}

/**
 * Integration with useKeyboardNavigation hook
 *
 * This shows how the virtual list API will integrate with keyboard navigation.
 *
 * @example
 * ```typescript
 * function ObjectsTable({ items }: Props) {
 *   // Virtual list (future)
 *   const virtualList = useVirtualList({
 *     itemCount: items.length,
 *     estimatedItemHeight: 48,
 *     overscan: 5,
 *     getItemKey: (index) => items[index].key,
 *   });
 *
 *   // Keyboard navigation (current)
 *   const { focusedKey, setFocusedKey } = useKeyboardNavigation({
 *     items,
 *     onNavigate: (key) => {
 *       setFocusedKey(key);
 *
 *       // Ensure focused item is visible
 *       virtualList.scrollToKey(key, {
 *         align: "center",
 *         behavior: "auto",
 *       });
 *     },
 *   });
 *
 *   // Render only visible items
 *   const { startIndex, endIndex } = virtualList.getVisibleRange();
 *   const visibleItems = items.slice(startIndex, endIndex + 1);
 *
 *   return (
 *     <div>
 *       {visibleItems.map((item) => (
 *         <ObjectRow
 *           key={item.key}
 *           item={item}
 *           isHighlighted={item.key === focusedKey}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */

/**
 * Stub implementation for future use
 *
 * This is a no-op implementation that maintains API compatibility
 * but doesn't actually virtualize. Replace with real implementation
 * when needed.
 */
export function createVirtualListStub(): VirtualListMethods {
  return {
    scrollToKey: () => {
      // No-op: All items are rendered, so no scrolling needed
      return true;
    },

    scrollToIndex: () => {
      // No-op
    },

    getVisibleRange: () => {
      // All items visible (not virtualized)
      return { startIndex: 0, endIndex: Infinity };
    },

    isVisible: () => {
      // All items visible (not virtualized)
      return true;
    },

    recalculate: () => {
      // No-op
    },
  };
}

/**
 * Performance thresholds for virtualization
 *
 * Use these thresholds to decide when to implement virtualization.
 */
export const VIRTUALIZATION_THRESHOLDS = {
  /**
   * Number of items where virtualization becomes beneficial
   * Below this, overhead of virtualization outweighs benefits
   */
  MIN_ITEMS_FOR_VIRTUALIZATION: 1000,

  /**
   * Number of items where virtualization is strongly recommended
   * Performance degradation becomes noticeable
   */
  RECOMMENDED_THRESHOLD: 5000,

  /**
   * Number of items where virtualization is required
   * UI becomes unusable without virtualization
   */
  REQUIRED_THRESHOLD: 10000,

  /**
   * Target number of rendered items at any time
   * Keeps DOM size manageable
   */
  TARGET_RENDERED_ITEMS: 50,

  /**
   * Number of items to render outside viewport
   * Prevents white flashes during fast scrolling
   */
  OVERSCAN_COUNT: 5,
};

/**
 * Recommended virtualization libraries
 *
 * When implementing virtualization, consider these battle-tested options:
 *
 * 1. **@tanstack/react-virtual** (Recommended)
 *    - Modern, lightweight, well-maintained
 *    - Excellent TypeScript support
 *    - Works with TanStack ecosystem
 *    - Dynamic height support
 *    - ~5KB gzipped
 *
 * 2. **react-window**
 *    - Proven, stable, widely used
 *    - Fixed height requirements
 *    - Minimal API surface
 *    - ~3KB gzipped
 *
 * 3. **react-virtuoso**
 *    - Advanced features (infinite scroll, grouping)
 *    - Dynamic heights out of the box
 *    - More opinionated
 *    - ~10KB gzipped
 *
 * **Recommendation**: Start with @tanstack/react-virtual for best balance
 * of features, performance, and maintainability.
 */

/**
 * Migration checklist for virtualization
 *
 * When implementing virtualization, follow this checklist:
 *
 * ✅ **Before Starting**:
 * 1. Measure current performance with profiler
 * 2. Confirm item count exceeds threshold (>1000)
 * 3. Document expected performance improvement
 *
 * ✅ **During Implementation**:
 * 1. Install virtualization library
 * 2. Wrap list in virtual container
 * 3. Update useKeyboardNavigation to use scrollToKey
 * 4. Add overscan for smooth scrolling
 * 5. Handle dynamic heights if needed
 * 6. Test keyboard navigation works correctly
 * 7. Test with various list sizes (10, 100, 1000, 10000+)
 *
 * ✅ **After Implementation**:
 * 1. Measure new performance (should be >2x improvement)
 * 2. Test keyboard navigation edge cases
 * 3. Verify accessibility (screen readers still work)
 * 4. Document implementation details
 * 5. Add performance monitoring
 *
 * ✅ **Testing Checklist**:
 * 1. Keyboard navigation (arrow keys, page up/down)
 * 2. Focus restoration after data changes
 * 3. Scroll position preservation
 * 4. Fast scrolling doesn't cause white flashes
 * 5. Works with filtering/sorting
 * 6. Screen reader announces items correctly
 * 7. Performance metrics meet targets
 */

/**
 * Code example: Full integration with virtualization
 *
 * This is how the final integration will look (future implementation):
 *
 * ```typescript
 * import { useVirtualizer } from "@tanstack/react-virtual";
 * import { useKeyboardNavigation } from "./hooks/useKeyboardNavigation";
 * import { useRef } from "react";
 *
 * function ObjectsTable({ items }: Props) {
 *   const containerRef = useRef<HTMLDivElement>(null);
 *
 *   // Virtual list setup
 *   const virtualizer = useVirtualizer({
 *     count: items.length,
 *     getScrollElement: () => containerRef.current,
 *     estimateSize: () => 48,
 *     overscan: 5,
 *   });
 *
 *   // Keyboard navigation
 *   const { focusedKey, setFocusedKey } = useKeyboardNavigation({
 *     items,
 *     onNavigate: (key) => {
 *       setFocusedKey(key);
 *
 *       // Find index of focused item
 *       const index = items.findIndex((item) => item.key === key);
 *       if (index !== -1) {
 *         // Scroll to focused item
 *         virtualizer.scrollToIndex(index, {
 *           align: "center",
 *           behavior: "auto",
 *         });
 *       }
 *     },
 *   });
 *
 *   const virtualItems = virtualizer.getVirtualItems();
 *
 *   return (
 *     <div ref={containerRef} style={{ height: "600px", overflow: "auto" }}>
 *       <div
 *         style={{
 *           height: `${virtualizer.getTotalSize()}px`,
 *           position: "relative",
 *         }}
 *       >
 *         {virtualItems.map((virtualItem) => {
 *           const item = items[virtualItem.index];
 *           return (
 *             <div
 *               key={item.key}
 *               style={{
 *                 position: "absolute",
 *                 top: 0,
 *                 left: 0,
 *                 width: "100%",
 *                 height: `${virtualItem.size}px`,
 *                 transform: `translateY(${virtualItem.start}px)`,
 *               }}
 *             >
 *               <ObjectRow
 *                 item={item}
 *                 isHighlighted={item.key === focusedKey}
 *               />
 *             </div>
 *           );
 *         })}
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */

export default {
  VIRTUALIZATION_THRESHOLDS,
  createVirtualListStub,
};
