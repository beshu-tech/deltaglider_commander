import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DirectoryCountsCell } from "../DirectoryCountsCell";
import { DirectoryCounts } from "../useDirectoryCounts";

describe("DirectoryCountsCell", () => {
  it("shows loading indicator when counts are undefined", () => {
    const { container } = render(<DirectoryCountsCell counts={undefined} />);
    expect(container.textContent).toBe("...");
  });

  it("shows em dash when both counts are zero", () => {
    const counts: DirectoryCounts = { files: 0, folders: 0, hasMore: false };
    const { container } = render(<DirectoryCountsCell counts={counts} />);
    expect(container.textContent).toBe("—");
  });

  it("renders single file correctly", () => {
    const counts: DirectoryCounts = { files: 1, folders: 0, hasMore: false };
    render(<DirectoryCountsCell counts={counts} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("file")).toBeInTheDocument();
  });

  it("renders multiple files correctly", () => {
    const counts: DirectoryCounts = { files: 5, folders: 0, hasMore: false };
    render(<DirectoryCountsCell counts={counts} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("files")).toBeInTheDocument();
  });

  it("renders single folder correctly", () => {
    const counts: DirectoryCounts = { files: 0, folders: 1, hasMore: false };
    render(<DirectoryCountsCell counts={counts} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("folder")).toBeInTheDocument();
  });

  it("renders multiple folders correctly", () => {
    const counts: DirectoryCounts = { files: 0, folders: 3, hasMore: false };
    render(<DirectoryCountsCell counts={counts} />);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("folders")).toBeInTheDocument();
  });

  it("renders both files and folders on separate lines", () => {
    const counts: DirectoryCounts = { files: 5, folders: 2, hasMore: false };
    const { container } = render(<DirectoryCountsCell counts={counts} />);

    // Check that both are rendered
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("files")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("folders")).toBeInTheDocument();

    // Check they're in separate divs (two-line layout)
    const lines = container.querySelectorAll(".flex.flex-col > div");
    expect(lines.length).toBe(2);
  });

  it("adds plus sign when hasMore is true", () => {
    const counts: DirectoryCounts = { files: 95, folders: 5, hasMore: true };
    render(<DirectoryCountsCell counts={counts} />);

    // Check that numbers and plus signs are rendered together
    const fileCount = screen.getByText((content, element) => {
      return !!(element?.className?.includes("tabular-nums") && content === "95+");
    });
    const folderCount = screen.getByText((content, element) => {
      return !!(element?.className?.includes("tabular-nums") && content === "5+");
    });

    expect(fileCount).toBeInTheDocument();
    expect(folderCount).toBeInTheDocument();
  });

  it("does not add plus sign when hasMore is false", () => {
    const counts: DirectoryCounts = { files: 50, folders: 10, hasMore: false };
    const { container } = render(<DirectoryCountsCell counts={counts} />);

    // Should not contain any "+" characters
    expect(container.textContent).not.toContain("+");
    expect(container.textContent).toContain("50");
    expect(container.textContent).toContain("10");
  });

  it("renders only files when folders is zero", () => {
    const counts: DirectoryCounts = { files: 42, folders: 0, hasMore: false };
    const { container } = render(<DirectoryCountsCell counts={counts} />);

    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("files")).toBeInTheDocument();
    expect(screen.queryByText("folders")).not.toBeInTheDocument();

    // Should only have one line
    const lines = container.querySelectorAll(".flex.flex-col > div");
    expect(lines.length).toBe(1);
  });

  it("renders only folders when files is zero", () => {
    const counts: DirectoryCounts = { files: 0, folders: 8, hasMore: false };
    const { container } = render(<DirectoryCountsCell counts={counts} />);

    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("folders")).toBeInTheDocument();
    expect(screen.queryByText("files")).not.toBeInTheDocument();

    // Should only have one line
    const lines = container.querySelectorAll(".flex.flex-col > div");
    expect(lines.length).toBe(1);
  });

  it("applies correct typography classes for compact display", () => {
    const counts: DirectoryCounts = { files: 10, folders: 5, hasMore: false };
    const { container } = render(<DirectoryCountsCell counts={counts} />);

    // Check for compact typography classes
    const parentDiv = container.querySelector(".flex.flex-col");
    expect(parentDiv?.className).toContain("gap-0.5");
    expect(parentDiv?.className).toContain("text-xs");
    expect(parentDiv?.className).toContain("leading-tight");
  });
});
