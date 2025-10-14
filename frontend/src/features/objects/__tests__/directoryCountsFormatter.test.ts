import { describe, it, expect } from "vitest";
import { formatDirectoryCounts } from "../directoryCountsFormatter";
import { DirectoryCounts } from "../useDirectoryCounts";

describe("formatDirectoryCounts", () => {
  it("shows loading indicator when counts are undefined", () => {
    expect(formatDirectoryCounts(undefined)).toBe("...");
  });

  it("shows em dash when both counts are zero", () => {
    const counts: DirectoryCounts = { files: 0, folders: 0, hasMore: false };
    expect(formatDirectoryCounts(counts)).toBe("—");
  });

  it("formats single file correctly", () => {
    const counts: DirectoryCounts = { files: 1, folders: 0, hasMore: false };
    expect(formatDirectoryCounts(counts)).toBe("1 file");
  });

  it("formats multiple files correctly", () => {
    const counts: DirectoryCounts = { files: 5, folders: 0, hasMore: false };
    expect(formatDirectoryCounts(counts)).toBe("5 files");
  });

  it("formats single folder correctly", () => {
    const counts: DirectoryCounts = { files: 0, folders: 1, hasMore: false };
    expect(formatDirectoryCounts(counts)).toBe("1 folder");
  });

  it("formats multiple folders correctly", () => {
    const counts: DirectoryCounts = { files: 0, folders: 3, hasMore: false };
    expect(formatDirectoryCounts(counts)).toBe("3 folders");
  });

  it("formats both files and folders correctly", () => {
    const counts: DirectoryCounts = { files: 5, folders: 2, hasMore: false };
    expect(formatDirectoryCounts(counts)).toBe("5 files, 2 folders");
  });

  it("adds plus sign when hasMore is true for files only", () => {
    const counts: DirectoryCounts = { files: 95, folders: 0, hasMore: true };
    expect(formatDirectoryCounts(counts)).toBe("95+ files");
  });

  it("adds plus sign when hasMore is true for folders only", () => {
    const counts: DirectoryCounts = { files: 0, folders: 5, hasMore: true };
    expect(formatDirectoryCounts(counts)).toBe("5+ folders");
  });

  it("adds plus sign when hasMore is true for both", () => {
    const counts: DirectoryCounts = { files: 95, folders: 5, hasMore: true };
    expect(formatDirectoryCounts(counts)).toBe("95+ files, 5+ folders");
  });

  it("handles single file with hasMore", () => {
    const counts: DirectoryCounts = { files: 1, folders: 0, hasMore: true };
    expect(formatDirectoryCounts(counts)).toBe("1+ file");
  });

  it("handles single folder with hasMore", () => {
    const counts: DirectoryCounts = { files: 0, folders: 1, hasMore: true };
    expect(formatDirectoryCounts(counts)).toBe("1+ folder");
  });

  it("handles exact limit with mixed counts", () => {
    const counts: DirectoryCounts = { files: 50, folders: 50, hasMore: true };
    expect(formatDirectoryCounts(counts)).toBe("50+ files, 50+ folders");
  });
});
