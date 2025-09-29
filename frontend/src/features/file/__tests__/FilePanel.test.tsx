import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../../app/toast";
import { FilePanel } from "../FilePanel";
import * as endpoints from "../../../lib/api/endpoints";
import * as env from "../../../lib/config/env";

const useFileMock = vi.fn();
const useDeleteObjectMock = vi.fn();
const downloadObjectMock = vi.fn(() => Promise.resolve());
const prepareDownloadMock = vi.spyOn(endpoints, "prepareDownload");
const getApiUrlMock = vi.spyOn(env, "getApiUrl");
const clipboardWriteMock = vi.fn().mockResolvedValue(undefined);

Object.assign(navigator, {
  clipboard: {
    writeText: clipboardWriteMock
  }
});

vi.mock("../useFile", () => ({
  useFile: (...args: unknown[]) => useFileMock(...args)
}));

vi.mock("../useDeleteObject", () => ({
  useDeleteObject: (...args: unknown[]) => useDeleteObjectMock(...args)
}));

vi.mock("../../../lib/utils/download", () => ({
  downloadObject: (...args: unknown[]) => downloadObjectMock(...args)
}));

const metadata = {
  key: "folder/example.txt",
  original_bytes: 2048,
  stored_bytes: 1024,
  compressed: true,
  modified: new Date().toISOString(),
  accept_ranges: true
};

beforeEach(() => {
  useFileMock.mockReturnValue({ data: metadata, isLoading: false, error: null });
  useDeleteObjectMock.mockReturnValue({
    mutate: vi.fn(),
    isPending: false
  });
  downloadObjectMock.mockClear();
  prepareDownloadMock.mockReset();
  prepareDownloadMock.mockResolvedValue({ download_token: "token-123" });
  getApiUrlMock.mockReturnValue("https://api.test");
  clipboardWriteMock.mockClear();
});

function renderPanel(overrides: Partial<React.ComponentProps<typeof FilePanel>> = {}) {
  const props: React.ComponentProps<typeof FilePanel> = {
    bucket: "test-bucket",
    objectKey: "folder/example.txt",
    onClose: vi.fn(),
    onDeleted: vi.fn(),
    ...overrides
  };

  return {
    user: userEvent.setup(),
    props,
    ...render(
      <ToastProvider>
        <FilePanel {...props} />
      </ToastProvider>
    )
  };
}

describe("FilePanel", () => {
  it("renders metadata and triggers download", async () => {
    const { user } = renderPanel();

    expect(screen.getByText("example.txt")).toBeInTheDocument();
    expect(screen.getByText(/compressed/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /download object/i }));

    expect(downloadObjectMock).toHaveBeenCalledWith(
      "test-bucket",
      "folder/example.txt",
      expect.any(Object)
    );
  });

  it("confirms deletion and calls mutation", async () => {
    const mutateSpy = vi.fn();
    useDeleteObjectMock.mockReturnValue({ mutate: mutateSpy, isPending: false });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { user } = renderPanel();

    await user.click(screen.getByRole("button", { name: /delete object/i }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(mutateSpy).toHaveBeenCalledWith("folder/example.txt", expect.any(Object));

    confirmSpy.mockRestore();
  });

  it("copies a signed download link", async () => {
    const user = userEvent.setup();
    renderPanel();

    // Find all buttons with the text to make sure we get the right one
    const copyButtons = screen.getAllByText("Copy download link");
    const copyButton = copyButtons[0]; // Take the first one
    expect(copyButton).toBeInTheDocument();

    await user.click(copyButton);

    await waitFor(() => {
      expect(prepareDownloadMock).toHaveBeenCalledWith("test-bucket", "folder/example.txt");
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(clipboardWriteMock).toHaveBeenCalledWith(
        "https://api.test/api/download/token-123"
      );
    }, { timeout: 3000 });
  });
});
