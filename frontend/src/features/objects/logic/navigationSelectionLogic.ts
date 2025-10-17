/**
 * Pure TypeScript navigation selection logic
 *
 * This module contains testable pure functions that determine which item
 * should be visually selected based on keyboard focus and URL state.
 *
 * NO React dependencies - fully testable with standard unit tests.
 */

export interface NavigableItem {
  key: string;
  type?: "directory" | "object" | "file" | "bucket";
}

/**
 * Calculate the key of the focused item based on focus index
 *
 * @param items - Array of navigable items
 * @param focusedIndex - Current focus index (-1 if no focus)
 * @returns The key of the focused item, or null if no focus
 *
 * @example
 * ```ts
 * const items = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];
 * calculateFocusedKey(items, 1) // returns 'b'
 * calculateFocusedKey(items, -1) // returns null
 * calculateFocusedKey(items, 10) // returns null (out of bounds)
 * ```
 */
export function calculateFocusedKey(
  items: readonly NavigableItem[],
  focusedIndex: number,
): string | null {
  if (focusedIndex < 0 || focusedIndex >= items.length) {
    return null;
  }
  return items[focusedIndex].key;
}

/**
 * Determine which key should be visually selected
 *
 * **Selection Priority**:
 * 1. If keyboard navigation is active AND there's a keyboard focus → use keyboard focus
 * 2. Otherwise → use URL-based selection (for deep linking)
 *
 * This ensures that:
 * - When user navigates with keyboard, they see their focus position
 * - When user returns from FilePanel, keyboard focus is visible
 * - When user loads page from URL, URL selection is respected
 *
 * @param urlSelectedKey - Key selected via URL/route (for deep linking)
 * @param keyboardFocusedKey - Key focused via keyboard navigation
 * @param isKeyboardActive - Whether keyboard navigation is currently active
 * @returns The key that should be visually selected, or null
 *
 * @example
 * ```ts
 * // Keyboard active with focus
 * getVisualSelectionKey('url-key', 'kbd-key', true) // returns 'kbd-key'
 *
 * // Keyboard inactive
 * getVisualSelectionKey('url-key', 'kbd-key', false) // returns 'url-key'
 *
 * // No keyboard focus
 * getVisualSelectionKey('url-key', null, true) // returns 'url-key'
 *
 * // Nothing selected
 * getVisualSelectionKey(null, null, false) // returns null
 * ```
 */
export function getVisualSelectionKey(
  urlSelectedKey: string | null,
  keyboardFocusedKey: string | null,
  isKeyboardActive: boolean,
): string | null {
  // Priority 1: Keyboard navigation active and has focus
  if (isKeyboardActive && keyboardFocusedKey !== null) {
    return keyboardFocusedKey;
  }

  // Priority 2: Fall back to URL selection
  return urlSelectedKey;
}

/**
 * Determine if an item should show visual selection
 *
 * @param itemKey - The key of the item to check
 * @param visualSelectionKey - The key that should be visually selected
 * @returns True if the item should show selection styling
 *
 * @example
 * ```ts
 * shouldShowSelection('item-1', 'item-1') // returns true
 * shouldShowSelection('item-1', 'item-2') // returns false
 * shouldShowSelection('item-1', null) // returns false
 * ```
 */
export function shouldShowSelection(itemKey: string, visualSelectionKey: string | null): boolean {
  return itemKey === visualSelectionKey;
}

/**
 * Find the index of an item by its key
 *
 * @param items - Array of navigable items
 * @param key - Key to search for
 * @returns Index of the item, or -1 if not found
 *
 * @example
 * ```ts
 * const items = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];
 * findItemIndex(items, 'b') // returns 1
 * findItemIndex(items, 'z') // returns -1
 * ```
 */
export function findItemIndex(items: readonly NavigableItem[], key: string | null): number {
  if (key === null) return -1;
  return items.findIndex((item) => item.key === key);
}

/**
 * Validate that a stored key still exists in the current items list
 *
 * Use this when restoring focus from sessionStorage to ensure
 * the item wasn't deleted or filtered out.
 *
 * @param items - Current array of navigable items
 * @param storedKey - Key retrieved from storage
 * @returns The key if valid, null if item no longer exists
 *
 * @example
 * ```ts
 * const items = [{ key: 'a' }, { key: 'b' }];
 * validateStoredKey(items, 'b') // returns 'b'
 * validateStoredKey(items, 'deleted') // returns null
 * ```
 */
export function validateStoredKey(
  items: readonly NavigableItem[],
  storedKey: string | null,
): string | null {
  if (storedKey === null) return null;
  const exists = items.some((item) => item.key === storedKey);
  return exists ? storedKey : null;
}

/**
 * Find the nearest neighbor key when the focused item is deleted
 *
 * Priority: previous item > next item > null
 *
 * @param items - Current array of navigable items
 * @param deletedKey - Key that was just deleted
 * @param currentFocusedKey - Currently focused key (should match deletedKey)
 * @returns Key of nearest neighbor, or null if list is empty
 *
 * @example
 * ```ts
 * const items = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];
 * findNearestNeighbor(items, 'b', 'b') // returns 'a' (previous)
 * findNearestNeighbor(items, 'a', 'a') // returns 'b' (next, no previous)
 * ```
 */
export function findNearestNeighbor(
  items: readonly NavigableItem[],
  deletedKey: string,
  currentFocusedKey: string | null,
): string | null {
  if (items.length === 0) return null;
  if (currentFocusedKey !== deletedKey) return currentFocusedKey;

  // Find where the deleted item was
  const deletedIndex = items.findIndex((item) => item.key === deletedKey);
  if (deletedIndex === -1) {
    // Item already gone, try to find any item
    return items[0]?.key ?? null;
  }

  // Prefer previous item
  if (deletedIndex > 0) {
    return items[deletedIndex - 1].key;
  }

  // Fall back to next item
  if (deletedIndex < items.length - 1) {
    return items[deletedIndex + 1].key;
  }

  // No neighbors (list now empty after deletion)
  return null;
}

/**
 * Initialize focus index based on URL selection
 *
 * When page loads with a URL-selected item, we should focus that item
 * so keyboard navigation starts from the correct position.
 *
 * @param items - Array of navigable items
 * @param urlSelectedKey - Key selected via URL
 * @returns Initial focus index, or -1 if not found
 *
 * @example
 * ```ts
 * const items = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];
 * initializeFocusIndex(items, 'b') // returns 1
 * initializeFocusIndex(items, null) // returns -1
 * ```
 */
export function initializeFocusIndex(
  items: readonly NavigableItem[],
  urlSelectedKey: string | null,
): number {
  return findItemIndex(items, urlSelectedKey);
}

/**
 * Get the last visited item from browser history or storage
 *
 * This is used to restore visual selection when returning to a list
 * from a detail view (e.g., returning to buckets list from objects view)
 *
 * @param storageKey - Key to use for retrieving from sessionStorage
 * @returns The last visited key, or null if not found
 *
 * @example
 * ```ts
 * const lastBucket = getLastVisitedKey('lastVisitedBucket');
 * // Use this to initialize focus when returning to buckets
 * ```
 */
export function getLastVisitedKey(storageKey: string): string | null {
  try {
    return sessionStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

/**
 * Save the last visited item to browser storage
 *
 * Call this when navigating away from a list to remember
 * which item was selected
 *
 * @param storageKey - Key to use for storing in sessionStorage
 * @param value - The key to remember
 *
 * @example
 * ```ts
 * // When user enters a bucket
 * setLastVisitedKey('lastVisitedBucket', bucketName);
 * ```
 */
export function setLastVisitedKey(storageKey: string, value: string | null): void {
  try {
    if (value === null) {
      sessionStorage.removeItem(storageKey);
    } else {
      sessionStorage.setItem(storageKey, value);
    }
  } catch {
    // Storage not available, silently fail
  }
}

/**
 * Check if an HTML element is editable (input field, textarea, etc.)
 *
 * Keyboard navigation should be disabled when user is typing.
 *
 * @param element - The HTML element to check
 * @returns True if element is editable
 *
 * @example
 * ```ts
 * const target = event.target as HTMLElement;
 * if (isEditable(target)) {
 *   return; // Don't handle keyboard navigation
 * }
 * ```
 */
export function isEditable(element: HTMLElement): boolean {
  const tagName = element.tagName;

  // Standard input elements
  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
    return true;
  }

  // ContentEditable elements
  if (element.isContentEditable) {
    return true;
  }

  // ARIA textbox role
  if (element.getAttribute("role") === "textbox") {
    return true;
  }

  return false;
}

/**
 * Check if keyboard event should be ignored
 *
 * Returns true if:
 * - Target is editable (input, textarea, etc.)
 * - IME composition is in progress (East Asian input)
 *
 * @param event - The keyboard event
 * @returns True if event should be ignored
 *
 * @example
 * ```ts
 * const handleKeyDown = (event: KeyboardEvent) => {
 *   if (shouldIgnoreKeyEvent(event)) return;
 *   // Handle keyboard navigation
 * };
 * ```
 */
export function shouldIgnoreKeyEvent(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement;

  // Ignore if typing in input field
  if (isEditable(target)) {
    return true;
  }

  // Ignore during IME composition (Japanese, Chinese, Korean input)
  if (event.isComposing) {
    return true;
  }

  return false;
}
