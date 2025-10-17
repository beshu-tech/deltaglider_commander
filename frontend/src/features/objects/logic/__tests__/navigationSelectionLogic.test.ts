import { describe, it, expect } from "vitest";
import {
  validateStoredKey,
  findNearestNeighbor,
  isEditable,
  shouldIgnoreKeyEvent,
  findItemIndex,
  getVisualSelectionKey,
} from "../navigationSelectionLogic";
import type { NavigableItem } from "../navigationSelectionLogic";

describe("navigationSelectionLogic", () => {
  describe("validateStoredKey", () => {
    const items: NavigableItem[] = [
      { type: "directory", key: "dir1/" },
      { type: "directory", key: "dir2/" },
      { type: "object", key: "file1.txt" },
      { type: "object", key: "file2.txt" },
    ];

    it("should return key if it exists in items", () => {
      expect(validateStoredKey(items, "file1.txt")).toBe("file1.txt");
      expect(validateStoredKey(items, "dir2/")).toBe("dir2/");
    });

    it("should return null if key does not exist", () => {
      expect(validateStoredKey(items, "nonexistent.txt")).toBeNull();
    });

    it("should return null if storedKey is null", () => {
      expect(validateStoredKey(items, null)).toBeNull();
    });

    it("should handle empty items list", () => {
      expect(validateStoredKey([], "any-key")).toBeNull();
    });

    it("should handle case-sensitive matching", () => {
      expect(validateStoredKey(items, "File1.txt")).toBeNull(); // Case mismatch
      expect(validateStoredKey(items, "file1.txt")).toBe("file1.txt"); // Exact match
    });
  });

  describe("findNearestNeighbor", () => {
    const items: NavigableItem[] = [
      { type: "directory", key: "dir1/" },
      { type: "directory", key: "dir2/" },
      { type: "object", key: "file1.txt" },
      { type: "object", key: "file2.txt" },
      { type: "object", key: "file3.txt" },
    ];

    it("should prefer previous item when deleting middle item", () => {
      const result = findNearestNeighbor(items, "file2.txt", "file2.txt");
      expect(result).toBe("file1.txt"); // Previous item
    });

    it("should return next item when deleting first item", () => {
      const result = findNearestNeighbor(items, "dir1/", "dir1/");
      expect(result).toBe("dir2/"); // Next item (no previous)
    });

    it("should return previous item when deleting last item", () => {
      const result = findNearestNeighbor(items, "file3.txt", "file3.txt");
      expect(result).toBe("file2.txt"); // Previous item (no next)
    });

    it("should return null when deleting only item", () => {
      const singleItem: NavigableItem[] = [{ type: "object", key: "only.txt" }];
      const result = findNearestNeighbor(singleItem, "only.txt", "only.txt");
      expect(result).toBeNull();
    });

    it("should return current focus if different from deleted key", () => {
      const result = findNearestNeighbor(items, "file2.txt", "file1.txt");
      expect(result).toBe("file1.txt"); // Keep current focus
    });

    it("should handle empty items list", () => {
      const result = findNearestNeighbor([], "any-key", "any-key");
      expect(result).toBeNull();
    });

    it("should handle deleted key not in list", () => {
      const result = findNearestNeighbor(items, "nonexistent.txt", "nonexistent.txt");
      // Falls back to first item since deleted index is -1
      expect(result).toBe("dir1/");
    });

    it("should return null when focus is null", () => {
      const result = findNearestNeighbor(items, "file2.txt", null);
      expect(result).toBeNull();
    });
  });

  describe("isEditable", () => {
    it("should detect INPUT elements", () => {
      const input = document.createElement("input");
      expect(isEditable(input)).toBe(true);
    });

    it("should detect TEXTAREA elements", () => {
      const textarea = document.createElement("textarea");
      expect(isEditable(textarea)).toBe(true);
    });

    it("should detect SELECT elements", () => {
      const select = document.createElement("select");
      expect(isEditable(select)).toBe(true);
    });

    it("should detect contentEditable elements", () => {
      const div = document.createElement("div");
      div.contentEditable = "true";
      expect(isEditable(div)).toBe(true);
    });

    it("should detect role=textbox", () => {
      const div = document.createElement("div");
      div.setAttribute("role", "textbox");
      expect(isEditable(div)).toBe(true);
    });

    it("should return false for non-editable elements", () => {
      const div = document.createElement("div");
      expect(isEditable(div)).toBe(false);

      const span = document.createElement("span");
      expect(isEditable(span)).toBe(false);

      const button = document.createElement("button");
      expect(isEditable(button)).toBe(false);
    });

    it("should handle inherit contentEditable", () => {
      const div = document.createElement("div");
      div.contentEditable = "inherit";
      expect(isEditable(div)).toBe(false);
    });
  });

  describe("shouldIgnoreKeyEvent", () => {
    it("should ignore events on INPUT elements", () => {
      const input = document.createElement("input");
      const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
      Object.defineProperty(event, "target", { value: input, writable: false });

      expect(shouldIgnoreKeyEvent(event)).toBe(true);
    });

    it("should ignore events on TEXTAREA elements", () => {
      const textarea = document.createElement("textarea");
      const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
      Object.defineProperty(event, "target", { value: textarea, writable: false });

      expect(shouldIgnoreKeyEvent(event)).toBe(true);
    });

    it("should ignore events on SELECT elements", () => {
      const select = document.createElement("select");
      const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
      Object.defineProperty(event, "target", { value: select, writable: false });

      expect(shouldIgnoreKeyEvent(event)).toBe(true);
    });

    it("should ignore events on contentEditable elements", () => {
      const div = document.createElement("div");
      div.contentEditable = "true";
      const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
      Object.defineProperty(event, "target", { value: div, writable: false });

      expect(shouldIgnoreKeyEvent(event)).toBe(true);
    });

    it("should ignore events during IME composition", () => {
      const div = document.createElement("div");
      const event = new KeyboardEvent("keydown", {
        key: "ArrowDown",
        isComposing: true,
      });
      Object.defineProperty(event, "target", { value: div, writable: false });

      expect(shouldIgnoreKeyEvent(event)).toBe(true);
    });

    it("should not ignore events on non-editable elements", () => {
      const div = document.createElement("div");
      const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
      Object.defineProperty(event, "target", { value: div, writable: false });

      expect(shouldIgnoreKeyEvent(event)).toBe(false);
    });

    it("should not ignore events when not composing", () => {
      const div = document.createElement("div");
      const event = new KeyboardEvent("keydown", {
        key: "ArrowDown",
        isComposing: false,
      });
      Object.defineProperty(event, "target", { value: div, writable: false });

      expect(shouldIgnoreKeyEvent(event)).toBe(false);
    });

    it("should handle role=textbox", () => {
      const div = document.createElement("div");
      div.setAttribute("role", "textbox");
      const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
      Object.defineProperty(event, "target", { value: div, writable: false });

      expect(shouldIgnoreKeyEvent(event)).toBe(true);
    });
  });

  describe("findItemIndex", () => {
    const items: NavigableItem[] = [
      { type: "directory", key: "dir1/" },
      { type: "directory", key: "dir2/" },
      { type: "object", key: "file1.txt" },
      { type: "object", key: "file2.txt" },
    ];

    it("should find index of existing key", () => {
      expect(findItemIndex(items, "dir1/")).toBe(0);
      expect(findItemIndex(items, "dir2/")).toBe(1);
      expect(findItemIndex(items, "file1.txt")).toBe(2);
      expect(findItemIndex(items, "file2.txt")).toBe(3);
    });

    it("should return -1 for non-existent key", () => {
      expect(findItemIndex(items, "nonexistent.txt")).toBe(-1);
    });

    it("should return -1 for null key", () => {
      expect(findItemIndex(items, null)).toBe(-1);
    });

    it("should return -1 for empty items", () => {
      expect(findItemIndex([], "any-key")).toBe(-1);
    });

    it("should handle case-sensitive matching", () => {
      expect(findItemIndex(items, "File1.txt")).toBe(-1); // Case mismatch
      expect(findItemIndex(items, "file1.txt")).toBe(2); // Exact match
    });
  });

  describe("getVisualSelectionKey", () => {
    it("should prioritize URL selection when not in keyboard mode", () => {
      const result = getVisualSelectionKey("url-key", "focused-key", false);
      expect(result).toBe("url-key");
    });

    it("should prioritize keyboard focus when in keyboard mode", () => {
      const result = getVisualSelectionKey("url-key", "focused-key", true);
      expect(result).toBe("focused-key");
    });

    it("should fallback to URL when keyboard focus is null", () => {
      const result = getVisualSelectionKey("url-key", null, true);
      expect(result).toBe("url-key");
    });

    it("should return focused key when URL is null", () => {
      const result = getVisualSelectionKey(null, "focused-key", false);
      expect(result).toBe("focused-key");
    });

    it("should return null when both are null", () => {
      const result = getVisualSelectionKey(null, null, false);
      expect(result).toBeNull();
    });

    it("should prefer keyboard focus over URL when in keyboard mode", () => {
      const result = getVisualSelectionKey("url-key", "focused-key", true);
      expect(result).toBe("focused-key");
    });

    it("should use URL selection in mouse mode", () => {
      const result = getVisualSelectionKey("url-key", "focused-key", false);
      expect(result).toBe("url-key");
    });
  });
});
