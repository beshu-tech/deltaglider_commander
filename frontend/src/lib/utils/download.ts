import { generatePresignedUrl } from "../api/endpoints";

export interface DownloadOptions {
  onPrepared?: (estimatedBytes: number) => void;
  onCompleted?: () => void;
  onError?: (error: unknown) => void;
  expiresIn?: number;
}

export async function downloadObject(
  bucket: string,
  key: string,
  options: DownloadOptions = {},
): Promise<void> {
  try {
    // Generate presigned URL with rehydration
    const presignedUrl = await generatePresignedUrl(bucket, key, options.expiresIn);
    options.onPrepared?.(presignedUrl.estimated_bytes);

    // Use the presigned URL to download directly
    const link = document.createElement("a");
    link.href = presignedUrl.download_url;
    link.download = key.split("/").pop() || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Call completed callback after a short delay to ensure download started
    setTimeout(() => {
      options.onCompleted?.();
    }, 500);
  } catch (error) {
    options.onError?.(error);
    throw error;
  }
}

export async function getPresignedDownloadUrl(
  bucket: string,
  key: string,
  expiresIn: number = 3600,
): Promise<string> {
  const presignedUrl = await generatePresignedUrl(bucket, key, expiresIn);
  return presignedUrl.download_url;
}
