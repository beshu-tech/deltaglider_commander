import { formatBytes } from "../../../lib/utils/bytes";
import { formatDateTime } from "../../../lib/utils/dates";

/**
 * Format deltaglider metadata values for better readability
 */
export function formatMetadataValue(key: string, value: string): string {
  // Format dates
  if ((key === "dg-created-at" || key === "dg-expires-at") && value.includes("T")) {
    return formatDateTime(value);
  }

  // Format file sizes
  if ((key === "dg-file-size" || key === "dg-delta-size") && /^\d+$/.test(value)) {
    return formatBytes(parseInt(value, 10));
  }

  // Truncate long hashes
  if ((key.includes("sha256") || key === "dg-etag") && value.length > 32) {
    return `${value.substring(0, 12)}...${value.substring(value.length - 12)}`;
  }

  return value;
}

/**
 * Extract file name from object key
 */
export function extractFileName(objectKey: string | null): string {
  if (!objectKey) return "";
  const parts = objectKey.split("/");
  return parts[parts.length - 1] || objectKey;
}

/**
 * Extract file path from bucket and object key
 */
export function extractFilePath(bucket: string | null, objectKey: string | null): string {
  if (!objectKey || !objectKey.includes("/")) return bucket || "";
  const pathParts = objectKey.split("/");
  pathParts.pop(); // Remove filename
  return `${bucket}/${pathParts.join("/")}`;
}
