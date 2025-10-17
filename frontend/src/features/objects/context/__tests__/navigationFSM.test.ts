import { describe, it, expect, vi } from "vitest";
import {
  createNavigationFSM,
  DEFAULT_TRANSITIONS,
  FSMValidator,
  FSMVisualizer,
} from "../navigationFSM";

describe("navigationFSM", () => {
  describe("Basic State Transitions", () => {
    it("should start in initial state", () => {
      const fsm = createNavigationFSM();
      expect(fsm.getState()).toBe("objects");
    });

    it("should allow custom initial state", () => {
      const fsm = createNavigationFSM({ initialState: "buckets" });
      expect(fsm.getState()).toBe("buckets");
    });

    it("should transition from objects to file-panel", () => {
      const fsm = createNavigationFSM();
      const success = fsm.transition("OPEN_FILE_PANEL");

      expect(success).toBe(true);
      expect(fsm.getState()).toBe("file-panel");
    });

    it("should transition from file-panel back to objects", () => {
      const fsm = createNavigationFSM();
      fsm.transition("OPEN_FILE_PANEL");
      const success = fsm.transition("CLOSE_FILE_PANEL");

      expect(success).toBe(true);
      expect(fsm.getState()).toBe("objects");
    });

    it("should handle Escape key from file-panel", () => {
      const fsm = createNavigationFSM();
      fsm.transition("OPEN_FILE_PANEL");
      const success = fsm.transition("ESCAPE_PRESSED");

      expect(success).toBe(true);
      expect(fsm.getState()).toBe("objects");
    });
  });

  describe("Invalid Transitions", () => {
    it("should reject invalid transition", () => {
      const fsm = createNavigationFSM();
      // Can't close file-panel when not in it
      const success = fsm.transition("CLOSE_FILE_PANEL");

      expect(success).toBe(false);
      expect(fsm.getState()).toBe("objects");
    });

    it("should call onInvalidTransition callback", () => {
      const onInvalidTransition = vi.fn();
      const fsm = createNavigationFSM({ onInvalidTransition });

      fsm.transition("CLOSE_FILE_PANEL"); // Invalid from objects

      expect(onInvalidTransition).toHaveBeenCalledWith("objects", "CLOSE_FILE_PANEL");
    });

    it("should not change state on invalid transition", () => {
      const fsm = createNavigationFSM();
      const initialState = fsm.getState();

      fsm.transition("CLOSE_FILE_PANEL"); // Invalid

      expect(fsm.getState()).toBe(initialState);
    });
  });

  describe("Complex Transition Flows", () => {
    it("should handle buckets → objects → file-panel flow", () => {
      const fsm = createNavigationFSM({ initialState: "buckets" });

      fsm.transition("NAVIGATE_TO_OBJECTS");
      expect(fsm.getState()).toBe("objects");

      fsm.transition("OPEN_FILE_PANEL");
      expect(fsm.getState()).toBe("file-panel");
    });

    it("should handle file-panel → dropdown → file-panel flow", () => {
      const fsm = createNavigationFSM();
      fsm.transition("OPEN_FILE_PANEL");

      fsm.transition("OPEN_DROPDOWN");
      expect(fsm.getState()).toBe("dropdown");

      fsm.transition("CLOSE_DROPDOWN");
      expect(fsm.getState()).toBe("file-panel");
    });

    it("should handle dropdown Escape key", () => {
      const fsm = createNavigationFSM();
      fsm.transition("OPEN_FILE_PANEL");
      fsm.transition("OPEN_DROPDOWN");

      fsm.transition("ESCAPE_PRESSED");
      expect(fsm.getState()).toBe("file-panel");
    });

    it("should handle modal from any state", () => {
      const fsm = createNavigationFSM();

      fsm.transition("OPEN_MODAL");
      expect(fsm.getState()).toBe("modal");

      fsm.transition("CLOSE_MODAL");
      expect(fsm.getState()).toBe("objects");
    });

    it("should handle modal Escape key", () => {
      const fsm = createNavigationFSM();
      fsm.transition("OPEN_MODAL");

      fsm.transition("ESCAPE_PRESSED");
      expect(fsm.getState()).toBe("objects");
    });
  });

  describe("Query Methods", () => {
    it("should check if transition is valid", () => {
      const fsm = createNavigationFSM();

      expect(fsm.canTransition("OPEN_FILE_PANEL")).toBe(true);
      expect(fsm.canTransition("CLOSE_FILE_PANEL")).toBe(false);
    });

    it("should return valid events from current state", () => {
      const fsm = createNavigationFSM();
      const events = fsm.getValidEvents();

      expect(events).toContain("OPEN_FILE_PANEL");
      expect(events).toContain("NAVIGATE_TO_BUCKETS");
      expect(events).toContain("OPEN_MODAL");
      expect(events).not.toContain("CLOSE_FILE_PANEL");
    });

    it("should return different valid events after transition", () => {
      const fsm = createNavigationFSM();
      fsm.transition("OPEN_FILE_PANEL");

      const events = fsm.getValidEvents();

      expect(events).toContain("CLOSE_FILE_PANEL");
      expect(events).toContain("ESCAPE_PRESSED");
      expect(events).toContain("OPEN_DROPDOWN");
      expect(events).not.toContain("OPEN_FILE_PANEL");
    });
  });

  describe("History Tracking", () => {
    it("should track transition history", () => {
      const fsm = createNavigationFSM();

      fsm.transition("OPEN_FILE_PANEL");
      fsm.transition("CLOSE_FILE_PANEL");

      const history = fsm.getHistory();

      expect(history).toHaveLength(2);
      expect(history[0]).toEqual({
        from: "objects",
        to: "file-panel",
        event: "OPEN_FILE_PANEL",
      });
      expect(history[1]).toEqual({
        from: "file-panel",
        to: "objects",
        event: "CLOSE_FILE_PANEL",
      });
    });

    it("should not record invalid transitions in history", () => {
      const fsm = createNavigationFSM();

      fsm.transition("CLOSE_FILE_PANEL"); // Invalid

      const history = fsm.getHistory();
      expect(history).toHaveLength(0);
    });

    it("should clear history on reset", () => {
      const fsm = createNavigationFSM();

      fsm.transition("OPEN_FILE_PANEL");
      fsm.reset();

      const history = fsm.getHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe("Reset Functionality", () => {
    it("should reset to initial state", () => {
      const fsm = createNavigationFSM();

      fsm.transition("OPEN_FILE_PANEL");
      fsm.reset();

      expect(fsm.getState()).toBe("objects");
    });

    it("should reset to custom initial state", () => {
      const fsm = createNavigationFSM({ initialState: "buckets" });

      fsm.transition("NAVIGATE_TO_OBJECTS");
      fsm.reset();

      expect(fsm.getState()).toBe("buckets");
    });
  });

  describe("Callbacks", () => {
    it("should call onTransition callback", () => {
      const onTransition = vi.fn();
      const fsm = createNavigationFSM({ onTransition });

      fsm.transition("OPEN_FILE_PANEL");

      expect(onTransition).toHaveBeenCalledWith("objects", "file-panel", "OPEN_FILE_PANEL");
    });

    it("should call onTransition for each transition", () => {
      const onTransition = vi.fn();
      const fsm = createNavigationFSM({ onTransition });

      fsm.transition("OPEN_FILE_PANEL");
      fsm.transition("CLOSE_FILE_PANEL");

      expect(onTransition).toHaveBeenCalledTimes(2);
    });

    it("should not call onTransition for invalid transitions", () => {
      const onTransition = vi.fn();
      const fsm = createNavigationFSM({ onTransition });

      fsm.transition("CLOSE_FILE_PANEL"); // Invalid

      expect(onTransition).not.toHaveBeenCalled();
    });
  });

  describe("Guards", () => {
    it("should respect guard conditions", () => {
      let allowTransition = false;

      const fsm = createNavigationFSM({
        transitions: [
          {
            from: "objects",
            event: "OPEN_FILE_PANEL",
            to: "file-panel",
            guard: () => allowTransition,
          },
        ],
      });

      // Guard returns false
      expect(fsm.transition("OPEN_FILE_PANEL")).toBe(false);
      expect(fsm.getState()).toBe("objects");

      // Guard returns true
      allowTransition = true;
      expect(fsm.transition("OPEN_FILE_PANEL")).toBe(true);
      expect(fsm.getState()).toBe("file-panel");
    });

    it("should include guarded transitions in canTransition", () => {
      let allowTransition = false;

      const fsm = createNavigationFSM({
        transitions: [
          {
            from: "objects",
            event: "OPEN_FILE_PANEL",
            to: "file-panel",
            guard: () => allowTransition,
          },
        ],
      });

      expect(fsm.canTransition("OPEN_FILE_PANEL")).toBe(false);

      allowTransition = true;
      expect(fsm.canTransition("OPEN_FILE_PANEL")).toBe(true);
    });
  });

  describe("Actions", () => {
    it("should execute action on transition", () => {
      const action = vi.fn();

      const fsm = createNavigationFSM({
        transitions: [
          {
            from: "objects",
            event: "OPEN_FILE_PANEL",
            to: "file-panel",
            action,
          },
        ],
      });

      fsm.transition("OPEN_FILE_PANEL");

      expect(action).toHaveBeenCalledTimes(1);
    });

    it("should not execute action on invalid transition", () => {
      const action = vi.fn();

      const fsm = createNavigationFSM({
        transitions: [
          {
            from: "objects",
            event: "OPEN_FILE_PANEL",
            to: "file-panel",
            action,
          },
        ],
      });

      fsm.transition("CLOSE_FILE_PANEL"); // Invalid

      expect(action).not.toHaveBeenCalled();
    });
  });

  describe("FSMValidator", () => {
    it("should validate completeness", () => {
      const errors = FSMValidator.validateCompleteness(DEFAULT_TRANSITIONS);
      expect(errors).toHaveLength(0);
    });

    it("should detect states with no exit transitions", () => {
      const errors = FSMValidator.validateCompleteness([
        {
          from: "objects",
          event: "OPEN_FILE_PANEL",
          to: "file-panel",
        },
      ]);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes("buckets"))).toBe(true);
    });

    it("should validate reachability", () => {
      const errors = FSMValidator.validateReachability(DEFAULT_TRANSITIONS, "objects");
      expect(errors).toHaveLength(0);
    });

    it("should detect unreachable states", () => {
      const errors = FSMValidator.validateReachability(
        [
          {
            from: "objects",
            event: "OPEN_FILE_PANEL",
            to: "file-panel",
          },
        ],
        "objects",
      );

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes("buckets"))).toBe(true);
    });

    it("should validate uniqueness", () => {
      const errors = FSMValidator.validateUniqueness(DEFAULT_TRANSITIONS);
      expect(errors).toHaveLength(0);
    });

    it("should detect duplicate transitions", () => {
      const errors = FSMValidator.validateUniqueness([
        {
          from: "objects",
          event: "OPEN_FILE_PANEL",
          to: "file-panel",
        },
        {
          from: "objects",
          event: "OPEN_FILE_PANEL",
          to: "file-panel",
        },
      ]);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("Duplicate");
    });

    it("should run all validations", () => {
      const errors = FSMValidator.validateAll(DEFAULT_TRANSITIONS, "objects");
      expect(errors).toHaveLength(0);
    });
  });

  describe("FSMVisualizer", () => {
    it("should generate Mermaid diagram", () => {
      const mermaid = FSMVisualizer.toMermaid(DEFAULT_TRANSITIONS);

      expect(mermaid).toContain("stateDiagram-v2");
      expect(mermaid).toContain("objects --> file-panel");
      expect(mermaid).toContain("OPEN FILE PANEL");
    });

    it("should generate ASCII table", () => {
      const table = FSMVisualizer.toTable(DEFAULT_TRANSITIONS);

      expect(table).toContain("State/Event");
      expect(table).toContain("objects");
      expect(table).toContain("file-panel");
      expect(table).toContain("|");
    });
  });
});
