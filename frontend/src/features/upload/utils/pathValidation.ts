/**
 * S3 Path Validation Utilities
 *
 * S3 object key naming rules:
 * - Can be up to 1024 characters long
 * - Can contain letters, numbers, and special characters: ! - _ . * ' ( )
 * - Should avoid: \ { } ^ % ` ] " > [ ~ < # | & $ @ = ; : + , ?
 * - Forward slash (/) is used as delimiter for hierarchy
 * - Leading/trailing spaces are trimmed by S3
 */

export interface PathValidation {
  isValid: boolean;
  error?: string;
  normalizedPath?: string;
}

const MAX_PATH_LENGTH = 1024;

// Characters that should be avoided in S3 keys
const PROBLEMATIC_CHARS = /[\\{}^%`\]">[~<#|&$@=;:+,?]/;

// Characters that are not allowed at all
// eslint-disable-next-line no-control-regex
const FORBIDDEN_CHARS = /[\x00-\x1F\x7F]/; // Control characters

/**
 * Normalize an S3 path by:
 * - Removing leading/trailing slashes
 * - Removing leading/trailing spaces
 * - Collapsing consecutive slashes
 */
export function normalizeS3Path(path: string): string {
  if (!path) return "";

  return path
    .trim()
    .replace(/^\/+/, "") // Remove leading slashes
    .replace(/\/+$/, "") // Remove trailing slashes
    .replace(/\/+/g, "/") // Collapse consecutive slashes
    .trim();
}

/**
 * Validate an S3 path according to S3 naming rules
 */
export function validateS3Path(path: string): PathValidation {
  // Empty path is valid (means bucket root)
  if (!path || path.trim() === "") {
    return { isValid: true, normalizedPath: "" };
  }

  const normalized = normalizeS3Path(path);

  // Check length
  if (normalized.length > MAX_PATH_LENGTH) {
    return {
      isValid: false,
      error: `Path too long (${normalized.length} characters). Maximum is ${MAX_PATH_LENGTH}.`,
    };
  }

  // Check for forbidden control characters
  if (FORBIDDEN_CHARS.test(normalized)) {
    return {
      isValid: false,
      error: "Path contains forbidden control characters.",
    };
  }

  // Warn about problematic characters (but still valid)
  if (PROBLEMATIC_CHARS.test(normalized)) {
    return {
      isValid: false,
      error:
        'Path contains characters that may cause issues. Avoid: \\ { } ^ % ` ] " > [ ~ < # | & $ @ = ; : + , ?',
    };
  }

  // Check for segments that are just dots (. or ..)
  const segments = normalized.split("/");
  const hasInvalidSegments = segments.some((segment) => segment === "." || segment === "..");
  if (hasInvalidSegments) {
    return {
      isValid: false,
      error: "Path segments cannot be '.' or '..'",
    };
  }

  // Check for empty segments (consecutive slashes after normalization shouldn't happen, but double-check)
  const hasEmptySegments = segments.some((segment) => segment.trim() === "");
  if (hasEmptySegments) {
    return {
      isValid: false,
      error: "Path contains empty segments.",
    };
  }

  return {
    isValid: true,
    normalizedPath: normalized,
  };
}

/**
 * Extract path segments from a normalized path
 */
export function getPathSegments(path: string): string[] {
  const normalized = normalizeS3Path(path);
  if (!normalized) return [];
  return normalized.split("/");
}

/**
 * Get parent path from a given path
 */
export function getParentPath(path: string): string {
  const segments = getPathSegments(path);
  if (segments.length <= 1) return "";
  return segments.slice(0, -1).join("/");
}

/**
 * Join path segments safely
 */
export function joinPaths(...segments: string[]): string {
  const joined = segments
    .filter((s) => s && s.trim())
    .map((s) => normalizeS3Path(s))
    .filter((s) => s)
    .join("/");

  return normalizeS3Path(joined);
}
