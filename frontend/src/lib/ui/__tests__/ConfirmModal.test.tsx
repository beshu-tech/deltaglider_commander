import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmModal } from "../ConfirmModal";
import { escapeStack } from "../../../features/objects/logic/escapeStack";

describe("ConfirmModal", () => {
  const defaultProps = {
    open: true,
    title: "Delete Object",
    message: "Are you sure you want to delete this object?",
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    // Clear escape stack before each test
    escapeStack.clear();
  });

  afterEach(() => {
    // Restore body overflow after each test
    document.body.style.overflow = "";
  });

  describe("Rendering", () => {
    it("should render modal when open", () => {
      render(<ConfirmModal {...defaultProps} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Delete Object")).toBeInTheDocument();
      expect(screen.getByText("Are you sure you want to delete this object?")).toBeInTheDocument();
    });

    it("should not render when closed", () => {
      render(<ConfirmModal {...defaultProps} open={false} />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should render with custom labels", () => {
      render(<ConfirmModal {...defaultProps} confirmLabel="Yes, Delete" cancelLabel="No, Keep" />);

      expect(screen.getByRole("button", { name: "Yes, Delete" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "No, Keep" })).toBeInTheDocument();
    });

    it("should render with default labels", () => {
      render(<ConfirmModal {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    });
  });

  describe("ARIA Attributes", () => {
    it("should have proper ARIA dialog attributes", () => {
      render(<ConfirmModal {...defaultProps} />);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(dialog).toHaveAttribute("aria-labelledby", "modal-title");
      expect(dialog).toHaveAttribute("aria-describedby", "modal-description");
    });

    it("should have accessible title and description", () => {
      render(<ConfirmModal {...defaultProps} />);

      expect(screen.getByText("Delete Object")).toHaveAttribute("id", "modal-title");
      expect(screen.getByText("Are you sure you want to delete this object?")).toHaveAttribute(
        "id",
        "modal-description",
      );
    });

    it("should have close button with aria-label", () => {
      render(<ConfirmModal {...defaultProps} />);

      expect(screen.getByLabelText("Close modal")).toBeInTheDocument();
    });
  });

  describe("Variant Styling", () => {
    it("should apply danger variant styles by default", () => {
      render(<ConfirmModal {...defaultProps} />);

      const confirmButton = screen.getByRole("button", { name: "Confirm" });
      expect(confirmButton.className).toContain("bg-red-600");
    });

    it("should apply warning variant styles", () => {
      render(<ConfirmModal {...defaultProps} variant="warning" />);

      const confirmButton = screen.getByRole("button", { name: "Confirm" });
      expect(confirmButton.className).toContain("bg-yellow-600");
    });

    it("should apply info variant styles", () => {
      render(<ConfirmModal {...defaultProps} variant="info" />);

      const confirmButton = screen.getByRole("button", { name: "Confirm" });
      expect(confirmButton.className).toContain("bg-primary-600");
    });
  });

  describe("User Interactions", () => {
    it("should call onConfirm when confirm button clicked", async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);

      await user.click(screen.getByRole("button", { name: "Confirm" }));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("should call onCancel when cancel button clicked", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("should call onCancel when close button clicked", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);

      await user.click(screen.getByLabelText("Close modal"));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("should call onCancel when backdrop clicked", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      const { container } = render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);

      // Click backdrop (first child of container)
      const backdrop = container.firstChild?.firstChild as HTMLElement;
      await user.click(backdrop);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe("Escape Key Handling", () => {
    it("should register with escape stack when open", () => {
      render(<ConfirmModal {...defaultProps} />);

      expect(escapeStack.getDepth()).toBe(1);
    });

    it("should unregister from escape stack when closed", () => {
      const { rerender } = render(<ConfirmModal {...defaultProps} open={true} />);

      expect(escapeStack.getDepth()).toBe(1);

      rerender(<ConfirmModal {...defaultProps} open={false} />);

      expect(escapeStack.getDepth()).toBe(0);
    });

    it("should call onCancel when Escape pressed", () => {
      const onCancel = vi.fn();
      render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);

      // Simulate Escape key
      const escapeEvent = new KeyboardEvent("keydown", { key: "Escape" });
      window.dispatchEvent(escapeEvent);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("should prevent event propagation when handling Escape", () => {
      render(<ConfirmModal {...defaultProps} />);

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
  });

  describe("Focus Management", () => {
    it("should auto-focus confirm button when modal opens", () => {
      render(<ConfirmModal {...defaultProps} />);

      const confirmButton = screen.getByRole("button", { name: "Confirm" });
      expect(confirmButton).toHaveFocus();
    });

    it("should prevent body scroll when open", () => {
      render(<ConfirmModal {...defaultProps} />);

      expect(document.body.style.overflow).toBe("hidden");
    });

    it("should restore body scroll when closed", () => {
      const { rerender } = render(<ConfirmModal {...defaultProps} open={true} />);

      expect(document.body.style.overflow).toBe("hidden");

      rerender(<ConfirmModal {...defaultProps} open={false} />);

      expect(document.body.style.overflow).toBe("");
    });
  });

  describe("Keyboard Navigation", () => {
    it("should allow Tab navigation between buttons", async () => {
      const user = userEvent.setup();
      render(<ConfirmModal {...defaultProps} />);

      const confirmButton = screen.getByRole("button", { name: "Confirm" });
      const cancelButton = screen.getByRole("button", { name: "Cancel" });

      expect(confirmButton).toHaveFocus();

      await user.tab();
      expect(cancelButton).toHaveFocus();

      await user.tab();
      // Focus should wrap back to confirm button (or stay on cancel depending on focus trap)
      expect(confirmButton).toHaveFocus();
    });
  });
});
