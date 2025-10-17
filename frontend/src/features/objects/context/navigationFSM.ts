/**
 * Finite State Machine (FSM) for TUI Navigation Context Transitions
 *
 * This FSM enforces valid state transitions and prevents invalid navigation flows.
 * It provides a formal model for the navigation context lifecycle.
 *
 * @example
 * ```typescript
 * const fsm = createNavigationFSM();
 *
 * // Valid transition
 * fsm.transition("OPEN_FILE_PANEL"); // buckets -> objects -> file-panel
 *
 * // Invalid transition throws error
 * fsm.transition("OPEN_FILE_PANEL"); // Already in file-panel, invalid
 * ```
 */

/**
 * Navigation states in the application
 */
export type NavigationState = "buckets" | "objects" | "file-panel" | "dropdown" | "modal";

/**
 * Events that trigger state transitions
 */
export type NavigationEvent =
  | "NAVIGATE_TO_BUCKETS"
  | "NAVIGATE_TO_OBJECTS"
  | "OPEN_FILE_PANEL"
  | "CLOSE_FILE_PANEL"
  | "OPEN_DROPDOWN"
  | "CLOSE_DROPDOWN"
  | "OPEN_MODAL"
  | "CLOSE_MODAL"
  | "ESCAPE_PRESSED";

/**
 * State transition definition
 */
interface Transition {
  from: NavigationState;
  event: NavigationEvent;
  to: NavigationState;
  guard?: () => boolean;
  action?: () => void;
}

/**
 * FSM configuration
 */
interface FSMConfig {
  initialState: NavigationState;
  transitions: Transition[];
  onTransition?: (from: NavigationState, to: NavigationState, event: NavigationEvent) => void;
  onInvalidTransition?: (state: NavigationState, event: NavigationEvent) => void;
}

/**
 * FSM instance
 */
export interface NavigationFSM {
  /** Current state */
  getState(): NavigationState;

  /** Attempt a state transition */
  transition(event: NavigationEvent): boolean;

  /** Check if transition is valid */
  canTransition(event: NavigationEvent): boolean;

  /** Get valid events from current state */
  getValidEvents(): NavigationEvent[];

  /** Reset to initial state */
  reset(): void;

  /** Get transition history (for debugging) */
  getHistory(): Array<{ from: NavigationState; to: NavigationState; event: NavigationEvent }>;
}

/**
 * Create a navigation FSM instance
 */
export function createNavigationFSM(config?: Partial<FSMConfig>): NavigationFSM {
  const fullConfig: FSMConfig = {
    initialState: config?.initialState ?? "objects",
    transitions: config?.transitions ?? DEFAULT_TRANSITIONS,
    onTransition: config?.onTransition,
    onInvalidTransition: config?.onInvalidTransition,
  };

  let currentState: NavigationState = fullConfig.initialState;
  const history: Array<{ from: NavigationState; to: NavigationState; event: NavigationEvent }> = [];

  function findTransition(event: NavigationEvent): Transition | undefined {
    return fullConfig.transitions.find(
      (t) => t.from === currentState && t.event === event && (!t.guard || t.guard()),
    );
  }

  return {
    getState() {
      return currentState;
    },

    transition(event: NavigationEvent): boolean {
      const transition = findTransition(event);

      if (!transition) {
        fullConfig.onInvalidTransition?.(currentState, event);
        return false;
      }

      const fromState = currentState;
      currentState = transition.to;

      // Record history
      history.push({ from: fromState, to: currentState, event });

      // Execute side effects
      transition.action?.();
      fullConfig.onTransition?.(fromState, currentState, event);

      return true;
    },

    canTransition(event: NavigationEvent): boolean {
      return findTransition(event) !== undefined;
    },

    getValidEvents(): NavigationEvent[] {
      return fullConfig.transitions
        .filter((t) => t.from === currentState && (!t.guard || t.guard()))
        .map((t) => t.event);
    },

    reset() {
      currentState = fullConfig.initialState;
      history.length = 0;
    },

    getHistory() {
      return [...history];
    },
  };
}

/**
 * Default transition table for navigation FSM
 *
 * Visual representation:
 *
 *     ┌─────────┐
 *     │ buckets │
 *     └────┬────┘
 *          │ NAVIGATE_TO_OBJECTS
 *          ▼
 *     ┌─────────┐
 *     │ objects │◄────────────┐
 *     └────┬────┘             │
 *          │ OPEN_FILE_PANEL  │ CLOSE_FILE_PANEL
 *          ▼                  │
 *     ┌───────────┐           │
 *     │file-panel │───────────┘
 *     └─────┬─────┘
 *           │ OPEN_DROPDOWN
 *           ▼
 *     ┌──────────┐
 *     │ dropdown │
 *     └─────┬────┘
 *           │ CLOSE_DROPDOWN
 *           └─────────► file-panel
 *
 *  Modal can overlay any state and returns to previous state on close.
 */
export const DEFAULT_TRANSITIONS: Transition[] = [
  // Buckets → Objects
  {
    from: "buckets",
    event: "NAVIGATE_TO_OBJECTS",
    to: "objects",
  },

  // Objects → Buckets (back navigation)
  {
    from: "objects",
    event: "NAVIGATE_TO_BUCKETS",
    to: "buckets",
  },

  // Objects → FilePanel
  {
    from: "objects",
    event: "OPEN_FILE_PANEL",
    to: "file-panel",
  },

  // FilePanel → Objects (close panel)
  {
    from: "file-panel",
    event: "CLOSE_FILE_PANEL",
    to: "objects",
  },

  // FilePanel → Objects (Escape key)
  {
    from: "file-panel",
    event: "ESCAPE_PRESSED",
    to: "objects",
  },

  // FilePanel → Dropdown
  {
    from: "file-panel",
    event: "OPEN_DROPDOWN",
    to: "dropdown",
  },

  // Dropdown → FilePanel
  {
    from: "dropdown",
    event: "CLOSE_DROPDOWN",
    to: "file-panel",
  },

  // Dropdown → FilePanel (Escape key)
  {
    from: "dropdown",
    event: "ESCAPE_PRESSED",
    to: "file-panel",
  },

  // Any state → Modal
  {
    from: "buckets",
    event: "OPEN_MODAL",
    to: "modal",
  },
  {
    from: "objects",
    event: "OPEN_MODAL",
    to: "modal",
  },
  {
    from: "file-panel",
    event: "OPEN_MODAL",
    to: "modal",
  },
  {
    from: "dropdown",
    event: "OPEN_MODAL",
    to: "modal",
  },

  // Modal → Previous state (simplified - returns to objects)
  // In production, you'd track previous state for proper restoration
  {
    from: "modal",
    event: "CLOSE_MODAL",
    to: "objects",
  },
  {
    from: "modal",
    event: "ESCAPE_PRESSED",
    to: "objects",
  },
];

/**
 * FSM validation utilities
 */
export const FSMValidator = {
  /**
   * Validate that all states have at least one exit transition
   */
  validateCompleteness(transitions: Transition[]): string[] {
    const errors: string[] = [];
    const states: NavigationState[] = ["buckets", "objects", "file-panel", "dropdown", "modal"];

    for (const state of states) {
      const hasExit = transitions.some((t) => t.from === state);
      if (!hasExit) {
        errors.push(`State "${state}" has no exit transitions`);
      }
    }

    return errors;
  },

  /**
   * Detect unreachable states
   */
  validateReachability(transitions: Transition[], initialState: NavigationState): string[] {
    const errors: string[] = [];
    const reachable = new Set<NavigationState>([initialState]);
    const states: NavigationState[] = ["buckets", "objects", "file-panel", "dropdown", "modal"];

    let changed = true;
    while (changed) {
      changed = false;
      for (const transition of transitions) {
        if (reachable.has(transition.from) && !reachable.has(transition.to)) {
          reachable.add(transition.to);
          changed = true;
        }
      }
    }

    for (const state of states) {
      if (!reachable.has(state)) {
        errors.push(`State "${state}" is unreachable from "${initialState}"`);
      }
    }

    return errors;
  },

  /**
   * Detect duplicate transitions (same from + event)
   */
  validateUniqueness(transitions: Transition[]): string[] {
    const errors: string[] = [];
    const seen = new Set<string>();

    for (const transition of transitions) {
      const key = `${transition.from}:${transition.event}`;
      if (seen.has(key)) {
        errors.push(`Duplicate transition: ${transition.from} + ${transition.event}`);
      }
      seen.add(key);
    }

    return errors;
  },

  /**
   * Run all validations
   */
  validateAll(transitions: Transition[], initialState: NavigationState): string[] {
    return [
      ...FSMValidator.validateCompleteness(transitions),
      ...FSMValidator.validateReachability(transitions, initialState),
      ...FSMValidator.validateUniqueness(transitions),
    ];
  },
};

/**
 * Visualization utilities for debugging
 */
export const FSMVisualizer = {
  /**
   * Generate Mermaid diagram of FSM
   */
  toMermaid(transitions: Transition[]): string {
    const lines = ["stateDiagram-v2"];

    for (const transition of transitions) {
      const label = transition.event.replace(/_/g, " ");
      lines.push(`    ${transition.from} --> ${transition.to}: ${label}`);
    }

    return lines.join("\n");
  },

  /**
   * Generate ASCII art transition table
   */
  toTable(transitions: Transition[]): string {
    const states: NavigationState[] = ["buckets", "objects", "file-panel", "dropdown", "modal"];
    const events: NavigationEvent[] = Array.from(
      new Set(transitions.map((t) => t.event)),
    ).sort() as NavigationEvent[];

    const header = ["State/Event", ...events].join(" | ");
    const separator = "-".repeat(header.length);

    const rows = states.map((state) => {
      const cells: string[] = [state];
      for (const event of events) {
        const transition = transitions.find((t) => t.from === state && t.event === event);
        cells.push(transition ? transition.to : "-");
      }
      return cells.join(" | ");
    });

    return [header, separator, ...rows].join("\n");
  },
};
