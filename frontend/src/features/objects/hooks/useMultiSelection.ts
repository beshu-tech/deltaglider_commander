import { useState, useCallback } from "react";

/**
 * Multi-selection state management hook
 *
 * Supports:
 * - Single selection (click)
 * - Range selection (Shift+Click, Shift+Arrow)
 * - Toggle selection (Ctrl+Click)
 * - Select all (Ctrl+A)
 * - Clear selection (Escape)
 *
 * @example
 * ```typescript
 * const {
 *   selectedKeys,
 *   isSelected,
 *   handleClick,
 *   selectAll,
 *   clearSelection,
 * } = useMultiSelection({ items });
 * ```
 */

export interface MultiSelectionItem {
  key: string;
}

export interface UseMultiSelectionProps {
  /** All selectable items */
  items: readonly MultiSelectionItem[];

  /** Callback when selection changes */
  onSelectionChange?: (selectedKeys: Set<string>) => void;
}

export interface UseMultiSelectionResult {
  /** Set of selected keys */
  selectedKeys: Set<string>;

  /** Check if key is selected */
  isSelected: (key: string) => boolean;

  /** Handle click with modifiers (Shift/Ctrl) */
  handleClick: (
    key: string,
    event: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean },
  ) => void;

  /** Handle keyboard range selection (Shift+Arrow) */
  handleRangeSelect: (fromKey: string, toKey: string) => void;

  /** Select all items */
  selectAll: () => void;

  /** Clear all selections */
  clearSelection: () => void;

  /** Toggle single item */
  toggleSelection: (key: string) => void;

  /** Get selection count */
  getSelectionCount: () => number;

  /** Get selected items */
  getSelectedItems: () => MultiSelectionItem[];

  /** Last clicked key (for range selection) */
  lastClickedKey: string | null;
}

export function useMultiSelection({
  items,
  onSelectionChange,
}: UseMultiSelectionProps): UseMultiSelectionResult {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [lastClickedKey, setLastClickedKey] = useState<string | null>(null);

  const isSelected = useCallback(
    (key: string) => {
      return selectedKeys.has(key);
    },
    [selectedKeys],
  );

  const updateSelection = useCallback(
    (newSelection: Set<string>) => {
      setSelectedKeys(newSelection);
      onSelectionChange?.(newSelection);
    },
    [onSelectionChange],
  );

  const handleClick = useCallback(
    (key: string, event: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }) => {
      const isCtrl = event.ctrlKey || event.metaKey; // Mac uses Cmd

      if (event.shiftKey && lastClickedKey) {
        // Range selection
        const startIndex = items.findIndex((item) => item.key === lastClickedKey);
        const endIndex = items.findIndex((item) => item.key === key);

        if (startIndex !== -1 && endIndex !== -1) {
          const start = Math.min(startIndex, endIndex);
          const end = Math.max(startIndex, endIndex);

          const newSelection = new Set(selectedKeys);
          for (let i = start; i <= end; i++) {
            newSelection.add(items[i].key);
          }

          updateSelection(newSelection);
        }
      } else if (isCtrl) {
        // Toggle selection
        const newSelection = new Set(selectedKeys);
        if (newSelection.has(key)) {
          newSelection.delete(key);
        } else {
          newSelection.add(key);
        }

        updateSelection(newSelection);
        setLastClickedKey(key);
      } else {
        // Single selection
        const newSelection = new Set([key]);
        updateSelection(newSelection);
        setLastClickedKey(key);
      }
    },
    [items, lastClickedKey, selectedKeys, updateSelection],
  );

  const handleRangeSelect = useCallback(
    (fromKey: string, toKey: string) => {
      const startIndex = items.findIndex((item) => item.key === fromKey);
      const endIndex = items.findIndex((item) => item.key === toKey);

      if (startIndex !== -1 && endIndex !== -1) {
        const start = Math.min(startIndex, endIndex);
        const end = Math.max(startIndex, endIndex);

        const newSelection = new Set(selectedKeys);
        for (let i = start; i <= end; i++) {
          newSelection.add(items[i].key);
        }

        updateSelection(newSelection);
      }
    },
    [items, selectedKeys, updateSelection],
  );

  const selectAll = useCallback(() => {
    const newSelection = new Set(items.map((item) => item.key));
    updateSelection(newSelection);
  }, [items, updateSelection]);

  const clearSelection = useCallback(() => {
    updateSelection(new Set());
    setLastClickedKey(null);
  }, [updateSelection]);

  const toggleSelection = useCallback(
    (key: string) => {
      const newSelection = new Set(selectedKeys);
      if (newSelection.has(key)) {
        newSelection.delete(key);
      } else {
        newSelection.add(key);
      }
      updateSelection(newSelection);
    },
    [selectedKeys, updateSelection],
  );

  const getSelectionCount = useCallback(() => {
    return selectedKeys.size;
  }, [selectedKeys]);

  const getSelectedItems = useCallback(() => {
    return items.filter((item) => selectedKeys.has(item.key));
  }, [items, selectedKeys]);

  return {
    selectedKeys,
    isSelected,
    handleClick,
    handleRangeSelect,
    selectAll,
    clearSelection,
    toggleSelection,
    getSelectionCount,
    getSelectedItems,
    lastClickedKey,
  };
}
