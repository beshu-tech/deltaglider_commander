import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BucketsPanel } from "../BucketsPanel";

const navigateMock = vi.fn();
const useBucketsMock = vi.fn();
const useDeleteBucketMock = vi.fn();
const useSavingsMock = vi.fn();
const useBucketStatsMock = vi.fn();
const useRefreshBucketStatsMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("../useBuckets", () => ({
  useBuckets: () => useBucketsMock(),
}));

vi.mock("../useBucketManagement", () => ({
  useDeleteBucket: () => useDeleteBucketMock(),
}));

vi.mock("../useBucketStats", () => ({
  useBucketStats: (...args: unknown[]) => useBucketStatsMock(...args),
}));

vi.mock("../useRefreshBucketStats", () => ({
  useRefreshBucketStats: (...args: unknown[]) => useRefreshBucketStatsMock(...args),
}));

vi.mock("../../savings/useSavings", () => ({
  useSavings: (...args: unknown[]) => useSavingsMock(...args),
}));

const buckets = [
  {
    name: "alpha",
    object_count: 10,
    original_bytes: 100,
    stored_bytes: 80,
    savings_pct: 20,
    pending: false,
  },
];

beforeEach(() => {
  navigateMock.mockReset();
  useBucketsMock.mockReturnValue({ data: buckets, isLoading: false, isError: false, error: null });
  useDeleteBucketMock.mockReturnValue({ mutate: vi.fn(), isPending: false, variables: undefined });
  useSavingsMock.mockReturnValue({ mutate: vi.fn(), isPending: false });
  useBucketStatsMock.mockReturnValue({
    data: buckets[0],
    isLoading: false,
    isError: false,
    error: null,
    isPlaceholderData: false,
  });
  useRefreshBucketStatsMock.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
});

describe("BucketsPanel", () => {
  it("navigates to bucket objects on row click", async () => {
    const user = userEvent.setup();
    render(<BucketsPanel />);

    const row = screen.getByText("alpha").closest("tr")!;
    await user.click(row);

    expect(navigateMock).toHaveBeenCalledWith({
      to: "/b/$bucket",
      params: { bucket: "alpha" },
      search: expect.any(Object),
    });
  });

  it("triggers savings mutation from button", async () => {
    const mutate = vi.fn();
    useSavingsMock.mockReturnValue({ mutate, isPending: false });
    const user = userEvent.setup();
    render(<BucketsPanel />);

    const row = screen.getByText("alpha").closest("tr")!;
    const button = within(row).getByRole("button", { name: /compute savings/i });
    await user.click(button);

    expect(mutate).toHaveBeenCalled();
  });

  it("confirms delete before calling mutation", async () => {
    const mutate = vi.fn();
    useDeleteBucketMock.mockReturnValue({ mutate, isPending: false, variables: undefined });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<BucketsPanel />);

    const row = screen.getByText("alpha").closest("tr")!;
    const deleteButton = within(row).getByRole("button", { name: /delete/i });
    await user.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalled();
    expect(mutate).toHaveBeenCalledWith("alpha");

    confirmSpy.mockRestore();
  });
});
