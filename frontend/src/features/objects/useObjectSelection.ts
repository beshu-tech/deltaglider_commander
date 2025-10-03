import { useCallback, useEffect, useMemo, useState } from "react";

export type SelectionTargetType = "object" | "prefix";

export interface SelectionTarget {
  type: SelectionTargetType;
  key: string;
}

interface UseObjectSelectionOptions {
  pageEntries: SelectionTarget[];
  resetToken?: unknown;
}

interface ObjectSelectionState {
  selectedObjects: string[];
  selectedPrefixes: string[];
  isSelected: (target: SelectionTarget) => boolean;
  toggleSelection: (target: SelectionTarget) => void;
  toggleSelectAll: () => void;
  clearSelection: () => void;
  pageSelectableCount: number;
  pageSelectedCount: number;
  totalSelectedCount: number;
  hasSelection: boolean;
}

const TOKEN_SEPARATOR = "::";

function serializeSelectionTarget(target: SelectionTarget): string {
  return `${target.type}${TOKEN_SEPARATOR}${encodeURIComponent(target.key)}`;
}

export function useObjectSelection({
  pageEntries,
  resetToken,
}: UseObjectSelectionOptions): ObjectSelectionState {
  const [selectedMap, setSelectedMap] = useState<Map<string, SelectionTarget>>(new Map());

  useEffect(() => {
    setSelectedMap(new Map());
  }, [resetToken]);

  const pageTokens = useMemo(
    () => pageEntries.map((entry) => serializeSelectionTarget(entry)),
    [pageEntries],
  );

  const pageSelectableCount = pageTokens.length;

  const pageSelectedCount = useMemo(() => {
    if (selectedMap.size === 0 || pageTokens.length === 0) {
      return 0;
    }
    return pageTokens.reduce((count, token) => count + (selectedMap.has(token) ? 1 : 0), 0);
  }, [pageTokens, selectedMap]);

  const toggleSelection = useCallback((target: SelectionTarget) => {
    setSelectedMap((current) => {
      const next = new Map(current);
      const token = serializeSelectionTarget(target);
      if (next.has(token)) {
        next.delete(token);
      } else {
        next.set(token, target);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedMap((current) => {
      if (pageTokens.length === 0) {
        return current;
      }
      const next = new Map(current);
      const allSelected = pageTokens.every((token) => next.has(token));
      if (allSelected) {
        pageTokens.forEach((token) => next.delete(token));
      } else {
        pageTokens.forEach((token, index) => {
          if (!next.has(token)) {
            next.set(token, pageEntries[index]);
          }
        });
      }
      return next;
    });
  }, [pageEntries, pageTokens]);

  const clearSelection = useCallback(() => {
    setSelectedMap(new Map());
  }, []);

  const selectedObjects = useMemo(() => {
    const keys: string[] = [];
    selectedMap.forEach((entry) => {
      if (entry.type === "object") {
        keys.push(entry.key);
      }
    });
    return keys;
  }, [selectedMap]);

  const selectedPrefixes = useMemo(() => {
    const prefixes: string[] = [];
    selectedMap.forEach((entry) => {
      if (entry.type === "prefix") {
        prefixes.push(entry.key);
      }
    });
    return prefixes;
  }, [selectedMap]);

  const totalSelectedCount = selectedMap.size;
  const hasSelection = totalSelectedCount > 0;

  const isSelected = useCallback(
    (target: SelectionTarget) => selectedMap.has(serializeSelectionTarget(target)),
    [selectedMap],
  );

  return {
    selectedObjects,
    selectedPrefixes,
    isSelected,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    pageSelectableCount,
    pageSelectedCount,
    totalSelectedCount,
    hasSelection,
  };
}
