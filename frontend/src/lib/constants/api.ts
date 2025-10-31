/**
 * API configuration constants
 *
 * IMPORTANT: These values must stay synchronized with backend!
 *
 * Backend source files (relative to project root):
 * - src/dgcommander/services/catalog.py (OBJECT_COUNT_LIMIT)
 * - src/dgcommander/util/paging.py (pagination defaults)
 * - src/dgcommander/contracts/objects.py (API contracts)
 */

export const OBJECT_COUNT_LIMIT = 15_000 as const;

export const PAGINATION = {
  DEFAULT_LIMIT: 100,
  MIN_LIMIT: 1,
  MAX_LIMIT: 1000,
} as const;

export const BULK_OPERATIONS = {
  MAX_DELETE_BATCH_SIZE: 1000,
  RECOMMENDED_DELETE_BATCH_SIZE: 100,
} as const;

export const PRESIGNED_URL = {
  MIN_EXPIRES_IN: 60,
  MAX_EXPIRES_IN: 604_800,
  DEFAULT_EXPIRES_IN: 3600,
} as const;
