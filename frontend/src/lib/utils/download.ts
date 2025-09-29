import { fetchDownload, prepareDownload } from "../api/endpoints";

export interface DownloadOptions {
  onPrepared?: (estimatedBytes: number) => void;
  onCompleted?: () => void;
  onError?: (error: unknown) => void;
}

export async function downloadObject(bucket: string, key: string, options: DownloadOptions = {}): Promise<void> {
  try {
    const { download_token, estimated_bytes } = await prepareDownload(bucket, key);
    options.onPrepared?.(estimated_bytes);
    const data = await fetchDownload(download_token);
    const blob = new Blob([data], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = key.split("/").pop() || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    options.onCompleted?.();
  } catch (error) {
    options.onError?.(error);
    throw error;
  }
}
