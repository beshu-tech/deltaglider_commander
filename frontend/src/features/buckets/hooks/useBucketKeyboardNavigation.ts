import { useEffect, useCallback, useRef, useMemo, useState } from "react";
import { Bucket } from "../types";
import {
  calculateFocusedKey,
  getLastVisitedKey,
  findItemIndex,
} from "../../objects/logic/navigationSelectionLogic";

interface UseBucketKeyboardNavigationProps {
  buckets: Bucket[];
  onBucketSelect: (bucket: Bucket) => void;
  enabled?: boolean;
}

export function useBucketKeyboardNavigation({
  buckets,
  onBucketSelect,
  enabled = true,
}: UseBucketKeyboardNavigationProps) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoize buckets array for stable reference
  const bucketList = useMemo(() => buckets, [buckets]);

  // Convert buckets to navigable items
  const bucketItems = useMemo(
    () => bucketList.map((b) => ({ key: b.name, type: "bucket" as const })),
    [bucketList],
  );

  // Initialize focus from last visited bucket (when returning from objects view)
  useEffect(() => {
    if (bucketList.length === 0) return;

    const lastVisited = getLastVisitedKey("lastVisitedBucket");
    if (lastVisited) {
      const index = findItemIndex(bucketItems, lastVisited);
      if (index >= 0) {
        setFocusedIndex(index);
      }
    }
  }, [bucketList.length, bucketItems]);

  // Get the row element for a given index
  const getRowElement = useCallback((index: number): HTMLTableRowElement | null => {
    if (!containerRef.current) return null;
    const rows =
      containerRef.current.querySelectorAll<HTMLTableRowElement>('tbody tr[role="button"]');
    return rows[index] || null;
  }, []);

  // Focus a specific row by index
  const focusRow = useCallback(
    (index: number) => {
      if (index < 0 || index >= bucketList.length) return;

      const row = getRowElement(index);
      if (row) {
        row.focus();
        setFocusedIndex(index);
      }
    },
    [bucketList.length, getRowElement],
  );

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || bucketList.length === 0) return;

      // Check if we're in an input or textarea
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      let handled = false;

      switch (event.key) {
        case "ArrowDown": {
          event.preventDefault();
          const nextIndex = focusedIndex < 0 ? 0 : (focusedIndex + 1) % bucketList.length;
          focusRow(nextIndex);
          handled = true;
          break;
        }

        case "ArrowUp": {
          event.preventDefault();
          const prevIndex = focusedIndex <= 0 ? bucketList.length - 1 : focusedIndex - 1;
          focusRow(prevIndex);
          handled = true;
          break;
        }

        case "ArrowRight":
        case "Enter": {
          // Only handle if a row is focused
          if (focusedIndex >= 0 && focusedIndex < bucketList.length) {
            event.preventDefault();
            const bucket = bucketList[focusedIndex];
            onBucketSelect(bucket);
            handled = true;
          }
          break;
        }
      }

      if (handled) {
        event.stopPropagation();
      }
    },
    [enabled, bucketList, onBucketSelect, focusRow, focusedIndex],
  );

  // Attach keyboard event listener
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  // Calculate focused key using pure logic
  const focusedKey = useMemo(
    () => calculateFocusedKey(bucketItems, focusedIndex),
    [bucketItems, focusedIndex],
  );

  // Reset focused index when buckets change (but preserve if last visited)
  useEffect(() => {
    const lastVisited = getLastVisitedKey("lastVisitedBucket");
    if (!lastVisited) {
      setFocusedIndex(-1);
    }
  }, [bucketList]);

  return {
    containerRef,
    focusedIndex,
    focusedKey,
    focusedBucketName:
      focusedIndex >= 0 && focusedIndex < bucketList.length ? bucketList[focusedIndex].name : null,
  };
}
