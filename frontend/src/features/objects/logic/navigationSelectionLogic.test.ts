import { describe, it, expect } from "vitest";
import {
  calculateFocusedKey,
  getVisualSelectionKey,
  shouldShowSelection,
  findItemIndex,
  initializeFocusIndex,
} from "./navigationSelectionLogic";

describe("navigationSelectionLogic", () => {
  describe("calculateFocusedKey", () => {
    const items = [
      { key: "item-a", type: "file" as const },
      { key: "item-b", type: "file" as const },
      { key: "item-c", type: "directory" as const },
    ];

    it("should return key of focused item", () => {
      expect(calculateFocusedKey(items, 0)).toBe("item-a");
      expect(calculateFocusedKey(items, 1)).toBe("item-b");
      expect(calculateFocusedKey(items, 2)).toBe("item-c");
    });

    it("should return null when index is -1 (no focus)", () => {
      expect(calculateFocusedKey(items, -1)).toBeNull();
    });

    it("should return null when index is out of bounds", () => {
      expect(calculateFocusedKey(items, 10)).toBeNull();
      expect(calculateFocusedKey(items, -5)).toBeNull();
    });

    it("should return null for empty items array", () => {
      expect(calculateFocusedKey([], 0)).toBeNull();
    });
  });

  describe("getVisualSelectionKey", () => {
    it("should return keyboard focused key when keyboard is active", () => {
      const result = getVisualSelectionKey("url-key", "kbd-key", true);
      expect(result).toBe("kbd-key");
    });

    it("should return URL key when keyboard is inactive", () => {
      const result = getVisualSelectionKey("url-key", "kbd-key", false);
      expect(result).toBe("url-key");
    });

    it("should return URL key when keyboard focus is null (even if active)", () => {
      const result = getVisualSelectionKey("url-key", null, true);
      expect(result).toBe("url-key");
    });

    it("should return null when both keys are null", () => {
      const result = getVisualSelectionKey(null, null, false);
      expect(result).toBeNull();
    });

    it("should prioritize keyboard focus over URL when active", () => {
      // This is the key behavior: when returning from FilePanel,
      // keyboard focus should be visible
      const result = getVisualSelectionKey(null, "kbd-key", true);
      expect(result).toBe("kbd-key");
    });
  });

  describe("shouldShowSelection", () => {
    it("should return true when item key matches selection key", () => {
      expect(shouldShowSelection("item-1", "item-1")).toBe(true);
    });

    it("should return false when item key does not match", () => {
      expect(shouldShowSelection("item-1", "item-2")).toBe(false);
    });

    it("should return false when selection key is null", () => {
      expect(shouldShowSelection("item-1", null)).toBe(false);
    });
  });

  describe("findItemIndex", () => {
    const items = [{ key: "item-a" }, { key: "item-b" }, { key: "item-c" }];

    it("should return correct index for existing item", () => {
      expect(findItemIndex(items, "item-a")).toBe(0);
      expect(findItemIndex(items, "item-b")).toBe(1);
      expect(findItemIndex(items, "item-c")).toBe(2);
    });

    it("should return -1 for non-existent item", () => {
      expect(findItemIndex(items, "item-z")).toBe(-1);
    });

    it("should return -1 when key is null", () => {
      expect(findItemIndex(items, null)).toBe(-1);
    });

    it("should return -1 for empty items array", () => {
      expect(findItemIndex([], "item-a")).toBe(-1);
    });
  });

  describe("initializeFocusIndex", () => {
    const items = [{ key: "item-a" }, { key: "item-b" }, { key: "item-c" }];

    it("should return index of URL-selected item", () => {
      expect(initializeFocusIndex(items, "item-b")).toBe(1);
    });

    it("should return -1 when URL selection is null", () => {
      expect(initializeFocusIndex(items, null)).toBe(-1);
    });

    it("should return -1 when URL selection not found", () => {
      expect(initializeFocusIndex(items, "item-z")).toBe(-1);
    });
  });

  describe("Integration: Full navigation flow", () => {
    const items = [
      { key: "file-1.txt", type: "file" as const },
      { key: "file-2.txt", type: "file" as const },
      { key: "file-3.txt", type: "file" as const },
    ];

    it("should handle user clicking file from URL", () => {
      // User navigates to /buckets/mybucket/file-2.txt
      const urlSelectedKey = "file-2.txt";
      const keyboardActive = false;
      const focusedIndex = -1;

      const focusedKey = calculateFocusedKey(items, focusedIndex);
      const visualKey = getVisualSelectionKey(urlSelectedKey, focusedKey, keyboardActive);

      expect(visualKey).toBe("file-2.txt");
      expect(shouldShowSelection("file-2.txt", visualKey)).toBe(true);
      expect(shouldShowSelection("file-1.txt", visualKey)).toBe(false);
    });

    it("should handle user navigating with keyboard", () => {
      // User presses down arrow to focus file-2
      const urlSelectedKey = null; // No URL selection
      const keyboardActive = true;
      const focusedIndex = 1; // User focused file-2

      const focusedKey = calculateFocusedKey(items, focusedIndex);
      const visualKey = getVisualSelectionKey(urlSelectedKey, focusedKey, keyboardActive);

      expect(focusedKey).toBe("file-2.txt");
      expect(visualKey).toBe("file-2.txt");
      expect(shouldShowSelection("file-2.txt", visualKey)).toBe(true);
    });

    it("should handle returning from FilePanel", () => {
      // User opened file-2 (keyboard focus maintained at index 1)
      // Then pressed Escape to close panel
      // URL selection cleared (null) but keyboard focus preserved
      const urlSelectedKey = null;
      const keyboardActive = true; // List becomes active again
      const focusedIndex = 1; // Keyboard state preserved

      const focusedKey = calculateFocusedKey(items, focusedIndex);
      const visualKey = getVisualSelectionKey(urlSelectedKey, focusedKey, keyboardActive);

      // This is the bug fix: keyboard focus should be visible!
      expect(focusedKey).toBe("file-2.txt");
      expect(visualKey).toBe("file-2.txt");
      expect(shouldShowSelection("file-2.txt", visualKey)).toBe(true);
    });
  });
});
