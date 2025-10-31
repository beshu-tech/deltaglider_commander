import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ObjectsView } from "../ObjectsView";
import { ObjectsSearchState } from "../types";
import { ToastProvider } from "../../../app/toast";
import { NavigationContextProvider } from "../context/NavigationContext";

const navigateMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("../../../lib/utils/download", () => ({
  downloadObject: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../../lib/api/endpoints", () => ({
  fetchObjects: vi.fn(() =>
    Promise.resolve({
      objects: [],
      common_prefixes: [],
      cursor: undefined,
    }),
  ),
}));

import { downloadObject } from "../../../lib/utils/download";
import { fetchObjects } from "../../../lib/api/endpoints";

vi.mock("../useObjectsCache", () => ({
  useObjectsCache: vi.fn(() => ({
    objects: [
      {
        key: "folder/file.txt",
        original_bytes: 1024,
        stored_bytes: 512,
        compressed: true,
        modified: new Date().toISOString(),
      },
    ],
    directories: ["folder/"],
    totalObjects: 1,
    totalDirectories: 1,
    totalItems: 2,
    currentPage: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    pageIndex: 0,
    isLoading: false,
    isError: false,
    isFetching: false,
    isLoadingFull: false,
    error: null,
    refetch: vi.fn(),
    directoryFileCounts: new Map(),
    isLoadingCounts: false,
    fetchProgress: null,
  })),
}));

const defaultSearch: ObjectsSearchState = {
  prefix: "",
  search: undefined,
  pageIndex: 0,
  sort: "modified",
  order: "desc",
  limit: 100,
  compression: "all",
};

const downloadObjectMock = vi.mocked(downloadObject);
const fetchObjectsMock = vi.mocked(fetchObjects);

beforeEach(() => {
  navigateMock.mockReset();
  downloadObjectMock.mockClear();
  fetchObjectsMock.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

function setup(overrides: Partial<React.ComponentProps<typeof ObjectsView>> = {}) {
  const queryClient = new QueryClient();
  const props: React.ComponentProps<typeof ObjectsView> = {
    bucket: "test-bucket",
    search: defaultSearch,
    onSearchChange: vi.fn(),
    onRowClick: vi.fn(),
    selectedKey: null,
    onNextPage: vi.fn(),
    onPreviousPage: vi.fn(),
    ...overrides,
  };

  return {
    user: userEvent.setup(),
    props,
    ...render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <NavigationContextProvider initialContext="objects">
            <ObjectsView {...props} />
          </NavigationContextProvider>
        </ToastProvider>
      </QueryClientProvider>,
    ),
  };
}

describe("ObjectsView", () => {
  it("renders table rows and reacts to row clicks", async () => {
    const onRowClick = vi.fn();
    setup({ onRowClick });

    // Wait for table to appear and get all instances
    const table = await screen.findByRole("table");
    const fileLinks = within(table).getAllByText("file.txt");
    expect(fileLinks.length).toBeGreaterThan(0);

    // Click the first occurrence in the table
    await userEvent.click(fileLinks[0]);
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ key: "folder/file.txt" }));
  });

  it.skip("triggers search change when submitting search form", async () => {
    const onSearchChange = vi.fn();
    const { user } = setup({ onSearchChange });

    // First, click the search button to expand the search field
    const searchButton = screen.getByLabelText("Open search");
    await user.click(searchButton);

    // Now the search input should be visible
    const searchInput = screen.getByPlaceholderText("Search files...");
    await user.clear(searchInput);

    // Type the search term (userEvent has default delays between keystrokes)
    await user.type(searchInput, "documents");

    // Wait for the debounce to complete (150ms + buffer)
    await waitFor(
      () => {
        expect(onSearchChange).toHaveBeenCalledWith(
          expect.objectContaining({ search: "documents" }),
        );
      },
      { timeout: 500 },
    );
  });

  it("shows selection bar when items are selected", async () => {
    const { user } = setup();
    const checkbox = await screen.findByLabelText("Select folder/file.txt");
    await user.click(checkbox);

    expect(screen.getByText("selected")).toBeInTheDocument();
    expect(screen.getByText(/on this page/)).toBeInTheDocument();
  });

  it("expands selected folders recursively during bulk download", async () => {
    const { user } = setup();
    // Get all checkboxes with this label and use the first one (in the table body)
    const folderCheckboxes = await screen.findAllByLabelText("Select folder folder");
    const folderCheckbox = folderCheckboxes[0];
    const now = new Date().toISOString();

    fetchObjectsMock.mockImplementationOnce(async () => ({
      objects: [
        {
          key: "folder/file.txt",
          original_bytes: 10,
          stored_bytes: 10,
          compressed: false,
          modified: now,
        },
      ],
      common_prefixes: ["folder/nested/"],
      cursor: undefined,
      limited: false,
    }));

    fetchObjectsMock.mockImplementationOnce(async () => ({
      objects: [
        {
          key: "folder/nested/deep.txt",
          original_bytes: 20,
          stored_bytes: 20,
          compressed: false,
          modified: now,
        },
      ],
      common_prefixes: [],
      cursor: undefined,
      limited: false,
    }));

    await user.click(folderCheckbox);
    const downloadButton = await screen.findByRole("button", { name: "Download" });
    await user.click(downloadButton);

    await waitFor(() => {
      expect(downloadObjectMock).toHaveBeenCalledTimes(2);
    });

    const downloadedKeys = downloadObjectMock.mock.calls.map(([, key]) => key);
    expect(downloadedKeys).toEqual(
      expect.arrayContaining(["folder/file.txt", "folder/nested/deep.txt"]),
    );
  });
});
