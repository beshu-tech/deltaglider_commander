import { ReactNode } from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "../Sidebar";
import { LayoutProvider } from "../LayoutContext";

const navigateMock = vi.fn();
const useMatchMock = vi.fn();
const useBucketsMock = vi.fn();
const useCreateBucketMock = vi.fn();

type LinkMockProps = {
  children: ReactNode;
  to: string;
  params?: unknown;
  search?: unknown;
} & Record<string, unknown>;

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, params, search, ...rest }: LinkMockProps) => {
    const { activeProps: _unused, ...anchorProps } = rest as Record<string, unknown>;
    void _unused;
    return (
      <a
        data-to={to}
        data-params={JSON.stringify(params)}
        data-search={JSON.stringify(search)}
        {...anchorProps}
      >
        {children}
      </a>
    );
  },
  useMatch: (options: unknown) => useMatchMock(options),
  useNavigate: () => navigateMock,
  useRouterState: () => ({
    location: { pathname: "/", search: "", hash: "" },
  }),
}));

vi.mock("../../../features/buckets/useBuckets", () => ({
  useBuckets: () => useBucketsMock(),
}));

vi.mock("../../../features/buckets/useBucketManagement", () => ({
  useCreateBucket: () => useCreateBucketMock(),
}));

const sampleBuckets = [
  {
    name: "alpha",
    object_count: 10,
    original_bytes: 100,
    stored_bytes: 80,
    savings_pct: 20,
    pending: false,
  },
  {
    name: "beta",
    object_count: 5,
    original_bytes: 50,
    stored_bytes: 40,
    savings_pct: 20,
    pending: true,
  },
];

beforeEach(() => {
  // Mock window.matchMedia
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  navigateMock.mockReset();
  useMatchMock.mockReturnValue({ params: { bucket: null } });
  useBucketsMock.mockReturnValue({
    data: sampleBuckets,
    isLoading: false,
    isError: false,
    error: null,
  });
  useCreateBucketMock.mockReturnValue({
    mutateAsync: vi.fn(() => Promise.resolve()),
    isPending: false,
  });
});

describe("Sidebar", () => {
  it("filters buckets based on search input", async () => {
    const user = userEvent.setup();
    render(
      <LayoutProvider>
        <Sidebar />
      </LayoutProvider>,
    );

    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("beta")).toBeInTheDocument();

    const filterInput = screen.getByPlaceholderText("Filter buckets...");
    await user.clear(filterInput);
    await user.type(filterInput, "alp");

    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.queryByText("beta")).toBeNull();
  });

  it("submits create bucket form and navigates to new bucket", async () => {
    const mutateAsync = vi.fn(() => Promise.resolve());
    useCreateBucketMock.mockReturnValue({ mutateAsync, isPending: false });
    const user = userEvent.setup();

    render(
      <LayoutProvider>
        <Sidebar />
      </LayoutProvider>,
    );

    // Click the create bucket button (using aria-label since it's icon-only now)
    await user.click(screen.getByRole("button", { name: /create bucket/i }));

    const nameInput = screen.getByPlaceholderText("e.g. images-prod");
    await user.type(nameInput, " new-bucket ");
    await user.click(screen.getByRole("button", { name: /create$/i }));

    expect(mutateAsync).toHaveBeenCalledWith("new-bucket");
    expect(navigateMock).toHaveBeenCalledWith({
      to: "/b/$bucket",
      params: { bucket: "new-bucket" },
      search: expect.any(Object),
    });
  });
});
