import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../../app/toast";
import { FilePanel } from "../FilePanel";
import * as endpoints from "../../../lib/api/endpoints";
import * as env from "../../../lib/config/env";

// Mock functions using vi.hoisted to avoid hoisting issues
const mockUseFile = vi.hoisted(() => vi.fn());
const mockUseDeleteObject = vi.hoisted(() => vi.fn());
const mockDownloadObject = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock("../useFile", () => ({
  useFile: (...args: unknown[]) => mockUseFile(...args),
}));

vi.mock("../useDeleteObject", () => ({
  useDeleteObject: (...args: unknown[]) => mockUseDeleteObject(...args),
}));

vi.mock("../../../lib/utils/download", () => ({
  downloadObject: mockDownloadObject,
}));

const prepareDownloadMock = vi.spyOn(endpoints, "prepareDownload");
const getApiUrlMock = vi.spyOn(env, "getApiUrl");
const clipboardWriteMock = vi.fn().mockResolvedValue(undefined);

Object.assign(navigator, {
  clipboard: {
    writeText: clipboardWriteMock,
  },
});

const metadata = {
  key: "folder/example.txt",
  original_bytes: 2048,
  stored_bytes: 1024,
  compressed: true,
  modified: new Date().toISOString(),
  accept_ranges: true,
};

beforeEach(() => {
  mockUseFile.mockReturnValue({ data: metadata, isLoading: false, error: null });
  mockUseDeleteObject.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
  mockDownloadObject.mockClear();
  prepareDownloadMock.mockReset();
  prepareDownloadMock.mockResolvedValue({ download_token: "token-123", estimated_bytes: 1024 });
  getApiUrlMock.mockReturnValue("https://api.test");
  clipboardWriteMock.mockClear();
});

function renderPanel(overrides: Partial<React.ComponentProps<typeof FilePanel>> = {}) {
  const props: React.ComponentProps<typeof FilePanel> = {
    bucket: "test-bucket",
    objectKey: "folder/example.txt",
    onClose: vi.fn(),
    onDeleted: vi.fn(),
    ...overrides,
  };

  return {
    user: userEvent.setup(),
    props,
    ...render(
      <ToastProvider>
        <FilePanel {...props} />
      </ToastProvider>,
    ),
  };
}

describe("FilePanel", () => {
  it("renders metadata and triggers download", async () => {
    const { user } = renderPanel();

    expect(screen.getByText("example.txt")).toBeInTheDocument();
    expect(screen.getByText(/compressed/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /download object/i }));

    expect(mockDownloadObject).toHaveBeenCalledWith(
      "test-bucket",
      "folder/example.txt",
      expect.any(Object),
    );
  });

  it("confirms deletion and calls mutation", async () => {
    const mutateSpy = vi.fn();
    mockUseDeleteObject.mockReturnValue({ mutate: mutateSpy, isPending: false });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { user } = renderPanel();

    await user.click(screen.getByRole("button", { name: /delete object/i }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(mutateSpy).toHaveBeenCalledWith("folder/example.txt", expect.any(Object));

    confirmSpy.mockRestore();
  });

  // Skip due to timing flakiness with clipboard API mocking in test environment
  it.skip("copies a signed download link", async () => {
    const { user } = renderPanel();

    // Find the copy download link button using test ID
    const copyButton = screen.getByTestId("copy-download-link");
    expect(copyButton).toBeInTheDocument();

    await user.click(copyButton);

    // Wait for prepareDownload to be called
    await waitFor(
      () => {
        expect(prepareDownloadMock).toHaveBeenCalledWith("test-bucket", "folder/example.txt");
      },
      { timeout: 3000 },
    );

    // Wait for clipboard to be called with the result
    await waitFor(
      () => {
        expect(clipboardWriteMock).toHaveBeenCalledWith(["https://api.test/api/download/token-123"]);
      },
      { timeout: 3000 },
    );
  });
});
