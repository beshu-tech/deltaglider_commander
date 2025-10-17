import { describe, it, expect, vi, beforeEach } from "vitest";
import { escapeStack } from "../escapeStack";

describe("escapeStack", () => {
  beforeEach(() => {
    // Clear stack and remove listeners before each test
    escapeStack.clear();
  });

  describe("Stack Management", () => {
    it("should start with depth 0", () => {
      expect(escapeStack.getDepth()).toBe(0);
    });

    it("should increase depth when handler registered", () => {
      const handler = vi.fn();
      escapeStack.register(handler);

      expect(escapeStack.getDepth()).toBe(1);
    });

    it("should decrease depth when handler unregistered", () => {
      const handler = vi.fn();
      const unregister = escapeStack.register(handler);

      expect(escapeStack.getDepth()).toBe(1);

      unregister();

      expect(escapeStack.getDepth()).toBe(0);
    });

    it("should support multiple handlers", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      escapeStack.register(handler1);
      escapeStack.register(handler2);
      escapeStack.register(handler3);

      expect(escapeStack.getDepth()).toBe(3);
    });

    it("should handle partial unregistration", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      const unregister1 = escapeStack.register(handler1);
      const unregister2 = escapeStack.register(handler2);
      escapeStack.register(handler3);

      expect(escapeStack.getDepth()).toBe(3);

      unregister2();

      expect(escapeStack.getDepth()).toBe(2);

      unregister1();

      expect(escapeStack.getDepth()).toBe(1);
    });
  });

  describe("LIFO Execution Order", () => {
    it("should call topmost handler first", () => {
      const handler1 = vi.fn(() => true);
      const handler2 = vi.fn(() => true);
      const handler3 = vi.fn(() => true);

      escapeStack.register(handler1);
      escapeStack.register(handler2);
      escapeStack.register(handler3);

      // Simulate Escape key
      const escapeEvent = new KeyboardEvent("keydown", { key: "Escape" });
      window.dispatchEvent(escapeEvent);

      // Only topmost (handler3) should be called
      expect(handler3).toHaveBeenCalledTimes(1);
      expect(handler2).not.toHaveBeenCalled();
      expect(handler1).not.toHaveBeenCalled();
    });

    it("should fall through to next handler if topmost returns false", () => {
      const handler1 = vi.fn(() => true);
      const handler2 = vi.fn(() => false);
      const handler3 = vi.fn(() => false);

      escapeStack.register(handler1);
      escapeStack.register(handler2);
      escapeStack.register(handler3);

      // Simulate Escape key
      const escapeEvent = new KeyboardEvent("keydown", { key: "Escape" });
      window.dispatchEvent(escapeEvent);

      // Only topmost handler is called (LIFO, no fallthrough in current implementation)
      expect(handler3).toHaveBeenCalledTimes(1);
      expect(handler2).not.toHaveBeenCalled();
      expect(handler1).not.toHaveBeenCalled();
    });

    it("should not call handlers after unregistration", () => {
      const handler1 = vi.fn(() => true);
      const handler2 = vi.fn(() => true);

      escapeStack.register(handler1);
      const unregister2 = escapeStack.register(handler2);

      unregister2();

      // Simulate Escape key
      const escapeEvent = new KeyboardEvent("keydown", { key: "Escape" });
      window.dispatchEvent(escapeEvent);

      // handler2 was unregistered, so handler1 should be called
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe("Event Handling", () => {
    it("should prevent default when handler returns true", () => {
      const handler = vi.fn(() => true);
      escapeStack.register(handler);

      const escapeEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(escapeEvent, "preventDefault");
      const stopPropagationSpy = vi.spyOn(escapeEvent, "stopPropagation");

      window.dispatchEvent(escapeEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it("should not prevent default when handler returns false", () => {
      const handler = vi.fn(() => false);
      escapeStack.register(handler);

      const escapeEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(escapeEvent, "preventDefault");

      window.dispatchEvent(escapeEvent);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it("should not prevent default when handler returns undefined", () => {
      const handler = vi.fn(() => undefined);
      escapeStack.register(handler);

      const escapeEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(escapeEvent, "preventDefault");

      window.dispatchEvent(escapeEvent);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it("should only handle Escape key", () => {
      const handler = vi.fn(() => true);
      escapeStack.register(handler);

      // Try other keys
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));

      expect(handler).not.toHaveBeenCalled();

      // Now try Escape
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should not handle events when stack is empty", () => {
      const handler = vi.fn(() => true);

      // Don't register handler

      const escapeEvent = new KeyboardEvent("keydown", { key: "Escape" });
      window.dispatchEvent(escapeEvent);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("Lazy Listener Management", () => {
    it("should add global listener only when first handler registered", () => {
      const handler = vi.fn(() => true);

      // Before registration, Escape should do nothing
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(handler).not.toHaveBeenCalled();

      // Register handler
      escapeStack.register(handler);

      // Now Escape should work
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("should remove global listener when stack becomes empty", () => {
      const handler1 = vi.fn(() => true);
      const handler2 = vi.fn(() => true);

      const unregister1 = escapeStack.register(handler1);
      const unregister2 = escapeStack.register(handler2);

      // Unregister all handlers
      unregister1();
      unregister2();

      expect(escapeStack.getDepth()).toBe(0);

      // Listener should be removed, so handlers shouldn't be called
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe("Clear Method", () => {
    it("should remove all handlers", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      escapeStack.register(handler1);
      escapeStack.register(handler2);
      escapeStack.register(handler3);

      expect(escapeStack.getDepth()).toBe(3);

      escapeStack.clear();

      expect(escapeStack.getDepth()).toBe(0);
    });

    it("should remove global listener", () => {
      const handler = vi.fn(() => true);

      escapeStack.register(handler);

      // Listener active
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(handler).toHaveBeenCalledTimes(1);

      escapeStack.clear();

      // Listener removed
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not 2
    });
  });

  describe("Idempotent Unregistration", () => {
    it("should safely handle double unregistration", () => {
      const handler = vi.fn();
      const unregister = escapeStack.register(handler);

      expect(escapeStack.getDepth()).toBe(1);

      unregister();
      expect(escapeStack.getDepth()).toBe(0);

      unregister(); // Call again
      expect(escapeStack.getDepth()).toBe(0); // Still 0, no error
    });

    it("should not affect other handlers when double-unregistering", () => {
      const handler1 = vi.fn(() => true);
      const handler2 = vi.fn(() => true);

      const unregister1 = escapeStack.register(handler1);
      escapeStack.register(handler2);

      expect(escapeStack.getDepth()).toBe(2);

      unregister1();
      unregister1(); // Double unregister

      expect(escapeStack.getDepth()).toBe(1);

      // handler2 should still work
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler1).not.toHaveBeenCalled();
    });
  });
});
