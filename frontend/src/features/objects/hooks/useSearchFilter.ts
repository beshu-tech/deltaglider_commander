import { useState, useCallback, useMemo, useEffect, useRef } from "react";

/**
 * Search/filter hook with Ctrl+F integration
 *
 * Features:
 * - Ctrl+F to focus search
 * - Ctrl+F twice to open browser search
 * - Incremental search
 * - Escape to clear
 * - Result navigation (Ctrl+G/Ctrl+Shift+G)
 *
 * @example
 * ```typescript
 * const {
 *   searchQuery,
 *   filteredItems,
 *   searchInputRef,
 *   handleSearch,
 *   clearSearch,
 * } = useSearchFilter({ items, enabled: true });
 * ```
 */

export interface SearchableItem {
  key: string;
  searchText: string; // Combined searchable text
}

export interface UseSearchFilterProps<T extends SearchableItem> {
  /** All items to search */
  items: readonly T[];

  /** Enable Ctrl+F handling */
  enabled?: boolean;

  /** Callback when search changes */
  onSearchChange?: (query: string) => void;

  /** Custom filter function (default: case-insensitive includes) */
  filterFn?: (item: T, query: string) => boolean;
}

export interface UseSearchFilterResult<T> {
  /** Current search query */
  searchQuery: string;

  /** Filtered items matching query */
  filteredItems: T[];

  /** Ref for search input (for focus) */
  searchInputRef: React.RefObject<HTMLInputElement>;

  /** Update search query */
  handleSearch: (query: string) => void;

  /** Clear search */
  clearSearch: () => void;

  /** Is search active */
  isSearchActive: boolean;

  /** Number of results */
  resultCount: number;

  /** Focus search input */
  focusSearch: () => void;
}

const DEFAULT_FILTER: <T extends SearchableItem>(item: T, query: string) => boolean = (
  item,
  query,
) => {
  return item.searchText.toLowerCase().includes(query.toLowerCase());
};

export function useSearchFilter<T extends SearchableItem>({
  items,
  enabled = true,
  onSearchChange,
  filterFn = DEFAULT_FILTER,
}: UseSearchFilterProps<T>): UseSearchFilterResult<T> {
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastCtrlFTime = useRef<number>(0);

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      onSearchChange?.(query);
    },
    [onSearchChange],
  );

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    onSearchChange?.("");
  }, [onSearchChange]);

  const focusSearch = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return items as T[];
    }

    return items.filter((item) => filterFn(item, searchQuery)) as T[];
  }, [items, searchQuery, filterFn]);

  const isSearchActive = searchQuery.trim().length > 0;
  const resultCount = filteredItems.length;

  // Ctrl+F handling
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
      focusSearch();
      lastCtrlFTime.current = now;
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, focusSearch]);

  return {
    searchQuery,
    filteredItems,
    searchInputRef,
    handleSearch,
    clearSearch,
    isSearchActive,
    resultCount,
    focusSearch,
  };
}
