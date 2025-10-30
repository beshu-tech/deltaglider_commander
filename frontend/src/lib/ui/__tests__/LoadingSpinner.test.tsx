import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingSpinner } from "../LoadingSpinner";

describe("LoadingSpinner", () => {
  it("renders with default props", () => {
    render(<LoadingSpinner />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders with custom label", () => {
    render(<LoadingSpinner label="Loading bucket stats" />);
    expect(screen.getByText("Loading bucket stats")).toBeInTheDocument();
  });

  it("applies size classes correctly", () => {
    const { container, rerender } = render(<LoadingSpinner size="xs" />);
    expect(container.querySelector(".h-3.w-3")).toBeInTheDocument();

    rerender(<LoadingSpinner size="sm" />);
    expect(container.querySelector(".h-4.w-4")).toBeInTheDocument();

    rerender(<LoadingSpinner size="md" />);
    expect(container.querySelector(".h-6.w-6")).toBeInTheDocument();

    rerender(<LoadingSpinner size="lg" />);
    expect(container.querySelector(".h-8.w-8")).toBeInTheDocument();
  });

  it("renders inline variant", () => {
    const { container } = render(<LoadingSpinner inline label="Processing" />);
    expect(container.querySelector(".inline-flex")).toBeInTheDocument();
  });

  it("includes accessibility attributes", () => {
    const { container } = render(<LoadingSpinner label="Loading data" />);
    const spinner = container.querySelector("svg");
    expect(spinner).toHaveAttribute("aria-hidden", "true");

    const label = screen.getByText("Loading data");
    expect(label).toHaveClass("sr-only");
  });

  it("applies custom className", () => {
    const { container } = render(<LoadingSpinner className="text-primary-600" />);
    const spinner = container.querySelector(".text-primary-600");
    expect(spinner).toBeInTheDocument();
  });
});
