# Escape Stack Usage Guide

**Purpose**: Global LIFO Escape key handler for hierarchical modal/overlay contexts
**Location**: `src/features/objects/logic/escapeStack.ts`
**Pattern**: Singleton with lazy listener management

---

## Overview

The Escape Stack provides a global, hierarchical Escape key handling system that prevents conflicts between nested contexts (modals, dropdowns, panels). It implements a **Last-In-First-Out (LIFO)** pattern where the most recently registered handler executes first.

### Key Features

✅ **LIFO Execution** - Topmost handler gets priority
✅ **Lazy Listeners** - Global listener only when stack has handlers
✅ **Auto-Cleanup** - Listener removed when stack empty
✅ **Event Consumption** - Handlers can prevent propagation
✅ **Idempotent Unregistration** - Safe to call cleanup multiple times

---

## Basic Usage

### 1. Register Handler in useEffect

```typescript
import { useEffect } from "react";
import { escapeStack } from "./logic/escapeStack";

function MyModal({ open, onClose }: ModalProps) {
  useEffect(() => {
    if (!open) return;

    // Register handler when modal opens
    const unregister = escapeStack.register(() => {
      onClose();
      return true; // Consumed - prevent propagation
    });

    // Cleanup when modal closes or unmounts
    return unregister;
  }, [open, onClose]);

  // ... rest of component
}
```

### 2. Handler Return Values

```typescript
// Return `true` to consume event (prevent propagation)
escapeStack.register(() => {
  closeModal();
  return true; // Event handled, stop propagation
});

// Return `false` or `undefined` to allow propagation
escapeStack.register(() => {
  logEscapePress();
  return false; // Allow other handlers to run
});
```

---

## Usage Patterns

### Pattern 1: Modal/Dialog

**Use Case**: Close modal on Escape key

```typescript
export function ConfirmModal({ open, onCancel }: Props) {
  useEffect(() => {
    if (!open) return;

    const unregister = escapeStack.register(() => {
      onCancel();
      return true; // Consumed
    });

    return unregister;
  }, [open, onCancel]);

  // ...
}
```

**Why LIFO Matters**: If modal opens over a panel, modal's Escape handler runs first, closing modal without affecting panel.

---

### Pattern 2: Dropdown Menu

**Use Case**: Close dropdown on Escape key

```typescript
export function DownloadDropdown({ isOpen, onClose }: Props) {
  useEffect(() => {
    if (!isOpen) return;

    const unregister = escapeStack.register(() => {
      onClose();
      return true;
    });

    return unregister;
  }, [isOpen, onClose]);

  // ...
}
```

---

### Pattern 3: File Panel

**Use Case**: Close panel on Escape, but only when no dropdown/modal open

```typescript
export function FilePanel({ onClose }: Props) {
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Panel registers FIRST (bottom of stack)
    const unregister = escapeStack.register(() => {
      onClose();
      return true;
    });

    return unregister;
  }, [onClose]);

  // Dropdown registers LATER (top of stack when open)
  // So dropdown's Escape handler runs before panel's
  // ...
}
```

---

### Pattern 4: Nested Contexts

**Use Case**: Modal over dropdown over panel

```typescript
// LIFO Stack Visualization:
//
// ┌─────────────────┐  ← Top (executes first)
// │  Modal Handler  │
// ├─────────────────┤
// │ Dropdown Handler│
// ├─────────────────┤
// │  Panel Handler  │  ← Bottom
// └─────────────────┘
//
// Escape press → Modal closes → Dropdown still open
```

**Implementation**:

```typescript
// Panel (registers first, bottom of stack)
function FilePanel() {
  useEffect(() => {
    const unregister = escapeStack.register(() => {
      closePanel();
      return true;
    });
    return unregister;
  }, []);
}

// Dropdown (registers second, middle of stack)
function Dropdown({ isOpen }) {
  useEffect(() => {
    if (!isOpen) return;
    const unregister = escapeStack.register(() => {
      closeDropdown();
      return true;
    });
    return unregister;
  }, [isOpen]);
}

// Modal (registers last, top of stack)
function Modal({ open }) {
  useEffect(() => {
    if (!open) return;
    const unregister = escapeStack.register(() => {
      closeModal();
      return true;
    });
    return unregister;
  }, [open]);
}
```

---

## Common Mistakes

### ❌ Mistake 1: Not Checking Open State

```typescript
// BAD: Registers handler even when closed
useEffect(() => {
  const unregister = escapeStack.register(() => {
    onClose();
    return true;
  });
  return unregister;
}, [onClose]);
```

```typescript
// GOOD: Only registers when open
useEffect(() => {
  if (!open) return; // ✅ Check open state

  const unregister = escapeStack.register(() => {
    onClose();
    return true;
  });
  return unregister;
}, [open, onClose]);
```

---

### ❌ Mistake 2: Not Returning Cleanup Function

```typescript
// BAD: Handler never unregisters
useEffect(() => {
  escapeStack.register(() => {
    onClose();
    return true;
  });
  // Missing cleanup!
}, [open, onClose]);
```

```typescript
// GOOD: Returns cleanup function
useEffect(() => {
  if (!open) return;

  const unregister = escapeStack.register(() => {
    onClose();
    return true;
  });

  return unregister; // ✅ Cleanup on unmount
}, [open, onClose]);
```

---

### ❌ Mistake 3: Forgetting to Consume Event

```typescript
// BAD: Doesn't return true, allows propagation
escapeStack.register(() => {
  onClose();
  // Missing return true!
});
```

```typescript
// GOOD: Returns true to consume event
escapeStack.register(() => {
  onClose();
  return true; // ✅ Prevent propagation
});
```

---

## Advanced Patterns

### Pattern: Conditional Handling

```typescript
useEffect(() => {
  if (!open) return;

  const unregister = escapeStack.register(() => {
    // Only handle if conditions met
    if (hasUnsavedChanges) {
      showConfirmDialog();
      return true; // Consumed
    }

    // Otherwise allow propagation
    return false;
  });

  return unregister;
}, [open, hasUnsavedChanges]);
```

---

### Pattern: Logging/Analytics

```typescript
useEffect(() => {
  if (!open) return;

  const unregister = escapeStack.register(() => {
    // Log escape press for analytics
    analytics.track("modal_escape_pressed");

    onClose();
    return true;
  });

  return unregister;
}, [open, onClose]);
```

---

## Integration with Navigation FSM

The Escape Stack works seamlessly with the Navigation FSM:

```typescript
import { escapeStack } from "./logic/escapeStack";
import { createNavigationFSM } from "./context/navigationFSM";

const fsm = createNavigationFSM();

// Register escape handler that triggers FSM transition
useEffect(() => {
  if (fsm.getState() !== "file-panel") return;

  const unregister = escapeStack.register(() => {
    // Trigger FSM transition
    fsm.transition("ESCAPE_PRESSED");
    return true;
  });

  return unregister;
}, []);
```

---

## Debugging

### Check Stack Depth

```typescript
import { escapeStack } from "./logic/escapeStack";

console.log("Stack depth:", escapeStack.getDepth());
// 0 = no handlers
// 1 = one handler (e.g., panel)
// 2 = two handlers (e.g., panel + dropdown)
// 3 = three handlers (e.g., panel + dropdown + modal)
```

### Clear Stack (Testing)

```typescript
import { escapeStack } from "./logic/escapeStack";

// Clear all handlers (useful in tests)
escapeStack.clear();
```

---

## Testing

### Unit Test Pattern

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { escapeStack } from "./escapeStack";

describe("MyComponent", () => {
  beforeEach(() => {
    escapeStack.clear(); // Clean state
  });

  it("should register escape handler when open", () => {
    render(<MyModal open={true} />);
    expect(escapeStack.getDepth()).toBe(1);
  });

  it("should unregister when closed", () => {
    const { rerender } = render(<MyModal open={true} />);
    rerender(<MyModal open={false} />);
    expect(escapeStack.getDepth()).toBe(0);
  });

  it("should handle escape key press", () => {
    const onClose = vi.fn();
    render(<MyModal open={true} onClose={onClose} />);

    // Simulate Escape
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(onClose).toHaveBeenCalled();
  });
});
```

---

## Performance Considerations

### Lazy Listener Management

The Escape Stack uses **lazy listener management** to avoid unnecessary global listeners:

```typescript
// No handlers registered → No global listener
escapeStack.getDepth(); // 0
// Performance impact: Zero

// First handler registered → Global listener added
escapeStack.register(handler1);
escapeStack.getDepth(); // 1
// Performance impact: Single keydown listener

// All handlers unregistered → Global listener removed
unregister1();
escapeStack.getDepth(); // 0
// Performance impact: Zero (listener cleaned up)
```

### Best Practices

✅ **Always check open state** - Avoid registering when closed
✅ **Return cleanup function** - Prevent memory leaks
✅ **Use dependency array** - Re-register when dependencies change
✅ **Return true to consume** - Prevent unwanted propagation
✅ **Clear in tests** - Ensure clean test state

---

## Migration from Direct Listeners

### Before (Direct Window Listener)

```typescript
// OLD: Direct window listener (conflicts with other components)
useEffect(() => {
  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      onClose();
    }
  };

  window.addEventListener("keydown", handleEscape);
  return () => window.removeEventListener("keydown", handleEscape);
}, [onClose]);
```

### After (Escape Stack)

```typescript
// NEW: Escape stack (hierarchical, no conflicts)
useEffect(() => {
  if (!open) return;

  const unregister = escapeStack.register(() => {
    onClose();
    return true;
  });

  return unregister;
}, [open, onClose]);
```

---

## API Reference

### `escapeStack.register(handler: EscapeHandler): () => void`

Register an Escape key handler.

**Parameters**:

- `handler: () => boolean | void` - Handler function that returns `true` to consume event

**Returns**: `() => void` - Cleanup function to unregister handler

**Example**:

```typescript
const unregister = escapeStack.register(() => {
  console.log("Escape pressed!");
  return true;
});

// Later...
unregister();
```

---

### `escapeStack.getDepth(): number`

Get current stack depth (number of registered handlers).

**Returns**: `number` - Current stack depth

**Example**:

```typescript
console.log(escapeStack.getDepth()); // 0, 1, 2, etc.
```

---

### `escapeStack.clear(): void`

Remove all handlers and global listener. Useful for testing.

**Example**:

```typescript
escapeStack.clear();
```

---

## Related Documentation

- [Navigation FSM Guide](./NAVIGATION_FSM_GUIDE.md)
- [TUI Keyboard Navigation Spec](./TUI_KEYBOARD_NAVIGATION_SPEC.md)
- [Testing Summary](./TUI_TESTING_SUMMARY.md)

---

## Summary

The Escape Stack is a **production-grade solution** for hierarchical Escape key handling in React applications. It solves the common problem of modal/dropdown conflicts by implementing a LIFO stack where the most recently opened context handles the Escape key first.

**Key Benefits**:

- ✅ No conflicts between nested contexts
- ✅ Automatic cleanup and memory management
- ✅ Minimal performance overhead (lazy listeners)
- ✅ Simple, intuitive API
- ✅ Fully tested (40+ test cases)
- ✅ TypeScript support
