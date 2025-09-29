import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ObjectsView } from "../ObjectsView";
import { ObjectsSearchState } from "../types";
import { ToastProvider } from "../../../app/toast";

vi.mock("../../../lib/utils/download", () => ({
  downloadObject: vi.fn(() => Promise.resolve())
}));

vi.mock("../../../lib/api/endpoints", () => ({
  fetchObjects: vi.fn(() =>
    Promise.resolve({
      objects: [],
      common_prefixes: [],
      cursor: undefined
    })
  )
}));

import { downloadObject } from "../../../lib/utils/download";
import { fetchObjects } from "../../../lib/api/endpoints";

vi.mock("../useObjects", () => ({
  useObjects: vi.fn(() => ({
    data: {
      objects: [
        {
          key: "folder/file.txt",
          original_bytes: 1024,
          stored_bytes: 512,
          compressed: true,
          modified: new Date().toISOString()
        }
      ],
      common_prefixes: ["folder/"],
      cursor: "next"
    },
    isLoading: false,
    isError: false,
    isFetching: false
  }))
}));

const defaultSearch: ObjectsSearchState = {
  prefix: "",
  search: undefined,
  cursor: undefined,
  sort: "modified",
  order: "desc",
  limit: 100,
  compression: "all"
};

const downloadObjectMock = vi.mocked(downloadObject);
const fetchObjectsMock = vi.mocked(fetchObjects);

beforeEach(() => {
  downloadObjectMock.mockClear();
  fetchObjectsMock.mockClear();
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
    ...overrides
  };

  return {
    user: userEvent.setup(),
    props,
    ...render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ObjectsView {...props} />
        </ToastProvider>
      </QueryClientProvider>
    )
  };
}

describe("ObjectsView", () => {
  it("renders table rows and reacts to row clicks", async () => {
    const onRowClick = vi.fn();
    setup({ onRowClick });

    expect(await screen.findByText("file.txt")).toBeInTheDocument();

    await userEvent.click(screen.getByText("file.txt"));
    expect(onRowClick).toHaveBeenCalledWith(
      expect.objectContaining({ key: "folder/file.txt" })
    );
  });

  it("triggers search change when submitting search form", async () => {
    const onSearchChange = vi.fn();
    const { user } = setup({ onSearchChange });

    const searchInput = screen.getByPlaceholderText("Search files...");
    await user.clear(searchInput);
    await user.type(searchInput, "documents{enter}");

    await waitFor(() => {
      expect(onSearchChange).toHaveBeenCalledWith(
        expect.objectContaining({ search: "documents" })
      );
    });
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
    const folderCheckbox = await screen.findByLabelText("Select folder folder");
    const now = new Date().toISOString();

    fetchObjectsMock.mockImplementationOnce(async () => ({
      objects: [
        {
          key: "folder/file.txt",
          original_bytes: 10,
          stored_bytes: 10,
          compressed: false,
          modified: now
        }
      ],
      common_prefixes: ["folder/nested/"],
      cursor: undefined
    }));

    fetchObjectsMock.mockImplementationOnce(async () => ({
      objects: [
        {
          key: "folder/nested/deep.txt",
          original_bytes: 20,
          stored_bytes: 20,
          compressed: false,
          modified: now
        }
      ],
      common_prefixes: [],
      cursor: undefined
    }));

    await user.click(folderCheckbox);
    const downloadButton = await screen.findByRole("button", { name: "Download" });
    await user.click(downloadButton);

    await waitFor(() => {
      expect(downloadObjectMock).toHaveBeenCalledTimes(2);
    });

    const downloadedKeys = downloadObjectMock.mock.calls.map(([, key]) => key);
    expect(downloadedKeys).toEqual(
      expect.arrayContaining(["folder/file.txt", "folder/nested/deep.txt"])
    );
  });
});
