/**
 * AWS and S3 configuration constants
 *
 * IMPORTANT: These values must stay synchronized with backend defaults!
 *
 * Backend source files (relative to project root):
 * - src/dgcommander/sdk/adapters/s3.py (line 61: region default)
 * - src/dgcommander/auth/credentials.py (line 53: region default)
 * - src/dgcommander/util/s3_context.py (lines 52, 75: endpoint defaults)
 *
 * To verify alignment, search backend for:
 *   grep -r "eu-west-1" src/dgcommander/
 *   grep -r "s3.amazonaws.com" src/dgcommander/
 */

/**
 * Default AWS region used when not specified by the user
 * Backend reference: s3.py line 61, credentials.py line 53
 */
export const DEFAULT_AWS_REGION = "eu-west-1" as const;

/**
 * Default S3 endpoint when using standard AWS S3
 * Backend reference: s3_context.py line 52, line 75
 */
export const DEFAULT_S3_ENDPOINT = "https://s3.amazonaws.com" as const;

/**
 * Display-friendly version of the default S3 endpoint (without protocol)
 */
export const DEFAULT_S3_ENDPOINT_DISPLAY = "s3.amazonaws.com" as const;

/**
 * Label to show for default region in UI
 */
export const DEFAULT_REGION_LABEL = `${DEFAULT_AWS_REGION} (default)` as const;

/**
 * Label to show for default endpoint in UI
 */
export const DEFAULT_ENDPOINT_LABEL = `${DEFAULT_S3_ENDPOINT_DISPLAY} (default)` as const;
