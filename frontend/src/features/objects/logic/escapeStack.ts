/**
 * Global Escape Stack Manager
 *
 * Implements a LIFO (Last In, First Out) stack for Escape key handling.
 * When multiple contexts are open (dropdown > panel > table), pressing
 * Escape should close the topmost context first.
 *
 * This prevents escape key conflicts and ensures proper modal hierarchy.
 */

type EscapeHandler = () => boolean | void;

class EscapeStackManager {
  private stack: EscapeHandler[] = [];
  private listener: ((event: KeyboardEvent) => void) | null = null;

  /**
   * Register an escape handler
   *
   * Call this when opening a context (panel, dropdown, modal).
   * The handler will be called when Escape is pressed.
   *
   * @param handler - Function to call on Escape. Return true if handled.
   * @returns Cleanup function to call when context closes
   *
   * @example
   * ```ts
   * useEffect(() => {
   *   const unregister = escapeStack.register(() => {
   *     handleClose();
   *     return true; // Consumed
   *   });
   *   return unregister; // Cleanup on unmount
   * }, []);
   * ```
   */
  register(handler: EscapeHandler): () => void {
    this.stack.push(handler);

    // Lazily add global listener
    if (!this.listener) {
      this.listener = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          this.handleEscape(event);
        }
      };
      window.addEventListener("keydown", this.listener);
    }

    // Return cleanup function
    return () => {
      const index = this.stack.indexOf(handler);
      if (index !== -1) {
        this.stack.splice(index, 1);
      }

      // Remove global listener if stack is empty
      if (this.stack.length === 0 && this.listener) {
        window.removeEventListener("keydown", this.listener);
        this.listener = null;
      }
    };
  }

  /**
   * Handle Escape key press
   *
   * Calls the topmost handler in the stack. If it returns true,
   * the event is consumed and propagation stops.
   */
  private handleEscape(event: KeyboardEvent): void {
    if (this.stack.length === 0) return;

    // Call topmost handler (LIFO)
    const handler = this.stack[this.stack.length - 1];
    const consumed = handler();

    if (consumed) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * Get current stack depth (for debugging/testing)
   */
  getDepth(): number {
    return this.stack.length;
  }

  /**
   * Clear all handlers (for testing)
   */
  clear(): void {
    this.stack = [];
    if (this.listener) {
      window.removeEventListener("keydown", this.listener);
      this.listener = null;
    }
  }
}

// Global singleton instance
export const escapeStack = new EscapeStackManager();
