/**
 * URL encoding utilities for S3 keys and paths
 */

/**
 * Encode an S3 key for use in URLs
 * S3 keys can contain '/' which need special handling
 *
 * @param key - S3 object key (e.g., "folder/subfolder/file.txt")
 * @returns URL-safe encoded key
 *
 * @example
 * encodeS3Key("my folder/file name.txt")
 * // Returns: "my%20folder/file%20name.txt"
 */
export function encodeS3Key(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

/**
 * Encode a bucket name for use in URLs
 *
 * @param bucket - S3 bucket name
 * @returns URL-safe encoded bucket name
 */
export function encodeBucketName(bucket: string): string {
  return encodeURIComponent(bucket);
}

/**
 * Build a full S3 path with proper encoding
 *
 * @param bucket - S3 bucket name
 * @param key - S3 object key
 * @returns Properly encoded path
 */
export function encodeS3Path(bucket: string, key: string): string {
  return `${encodeBucketName(bucket)}/${encodeS3Key(key)}`;
}
