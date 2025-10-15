/**
 * localStorage-based persistence for TanStack Query cache
 *
 * This provides persistent caching across page refreshes for object listings.
 * Cache entries are versioned and expire after a configurable TTL.
 */

const CACHE_VERSION = 2; // Bumped to invalidate old cache with incorrect compression stats
const CACHE_KEY_PREFIX = "dgcommander_cache_v";
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  version: number;
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Check if localStorage is available and working
 */
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = "__localStorage_test__";
    localStorage.setItem(testKey, "test");
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a cache key from query key array
 */
function getCacheKey(queryKey: readonly unknown[]): string {
  return `${CACHE_KEY_PREFIX}${CACHE_VERSION}_${JSON.stringify(queryKey)}`;
}

/**
 * Save data to localStorage with TTL
 */
export function saveToLocalStorage<T>(
  queryKey: readonly unknown[],
  data: T,
  ttlMs: number = DEFAULT_TTL_MS,
): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    const cacheKey = getCacheKey(queryKey);
    const now = Date.now();
    const entry: CacheEntry<T> = {
      version: CACHE_VERSION,
      data,
      timestamp: now,
      expiresAt: now + ttlMs,
    };

    localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (error) {
    // Quota exceeded or other error - silently fail
    console.warn("Failed to save to localStorage:", error);
  }
}

/**
 * Load data from localStorage, returning null if expired or invalid
 */
export function loadFromLocalStorage<T>(queryKey: readonly unknown[]): T | null {
  if (!isLocalStorageAvailable()) {
    return null;
  }

  try {
    const cacheKey = getCacheKey(queryKey);
    const raw = localStorage.getItem(cacheKey);

    if (!raw) {
      return null;
    }

    const entry = JSON.parse(raw) as CacheEntry<T>;

    // Check version
    if (entry.version !== CACHE_VERSION) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return entry.data;
  } catch (error) {
    // Parse error or other issue - silently fail
    console.warn("Failed to load from localStorage:", error);
    return null;
  }
}

/**
 * Remove specific cache entry
 */
export function removeFromLocalStorage(queryKey: readonly unknown[]): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    const cacheKey = getCacheKey(queryKey);
    localStorage.removeItem(cacheKey);
  } catch (error) {
    console.warn("Failed to remove from localStorage:", error);
  }
}

/**
 * Clear all cache entries (for debugging or cleanup)
 */
export function clearAllCache(): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    const prefix = `${CACHE_KEY_PREFIX}${CACHE_VERSION}_`;
    const keysToRemove: string[] = [];

    // Find all cache keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }

    // Remove them
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.warn("Failed to clear cache:", error);
  }
}

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats(): {
  totalEntries: number;
  totalSize: number;
  entries: Array<{ key: string; size: number; age: number }>;
} {
  if (!isLocalStorageAvailable()) {
    return { totalEntries: 0, totalSize: 0, entries: [] };
  }

  const prefix = `${CACHE_KEY_PREFIX}${CACHE_VERSION}_`;
  const entries: Array<{ key: string; size: number; age: number }> = [];
  let totalSize = 0;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        const value = localStorage.getItem(key);
        if (value) {
          const size = new Blob([value]).size;
          totalSize += size;

          try {
            const entry = JSON.parse(value) as CacheEntry<unknown>;
            const age = Date.now() - entry.timestamp;
            entries.push({ key, size, age });
          } catch {
            // Invalid entry, skip
          }
        }
      }
    }
  } catch (error) {
    console.warn("Failed to get cache stats:", error);
  }

  return {
    totalEntries: entries.length,
    totalSize,
    entries,
  };
}
