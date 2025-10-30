/**
 * Unified credential management system
 * Consolidates multi-profile storage, session management, and legacy migration
 */

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  endpoint: string;
  addressingStyle?: string;
  verify?: boolean;
}

export interface CredentialProfile {
  id: string;
  name: string;
  credentials: AWSCredentials;
  createdAt: number;
  lastUsedAt?: number;
}

interface ProfilesStorage {
  profiles: CredentialProfile[];
  activeProfileId: string | null;
}

// Constants
const PROFILES_STORAGE_KEY = "aws_credential_profiles";
const LEGACY_CREDENTIALS_KEY = "aws_credentials";
const ACTIVE_PROFILE_CHANGED_EVENT = "activeProfileChanged";

// Events
export const CREDENTIAL_EVENTS = {
  ACTIVE_PROFILE_CHANGED: ACTIVE_PROFILE_CHANGED_EVENT,
  // Legacy event for backward compatibility
  CREDENTIALS_CHANGED: "awsCredentialsChanged",
} as const;

// Utilities
function generateProfileId(): string {
  return `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function emitCredentialEvent(eventName: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(eventName));
}

function loadStorage(): ProfilesStorage {
  if (typeof window === "undefined") {
    return { profiles: [], activeProfileId: null };
  }

  const stored = localStorage.getItem(PROFILES_STORAGE_KEY);
  if (!stored) {
    return { profiles: [], activeProfileId: null };
  }

  try {
    const parsed = JSON.parse(stored) as ProfilesStorage;
    if (!Array.isArray(parsed.profiles)) {
      return { profiles: [], activeProfileId: null };
    }
    return parsed;
  } catch {
    return { profiles: [], activeProfileId: null };
  }
}

function saveStorage(storage: ProfilesStorage): void {
  if (typeof window === "undefined") return;

  // Don't persist empty storage - if there are no profiles, just remove the key
  if (storage.profiles.length === 0) {
    localStorage.removeItem(PROFILES_STORAGE_KEY);
    return;
  }

  localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(storage));
}

/**
 * Unified credential manager
 * Replaces credentialStorage.ts, credentialProfiles.ts
 */
export const CredentialManager = {
  // ============================================================================
  // Profile Management
  // ============================================================================

  /**
   * Get all credential profiles
   */
  list(): CredentialProfile[] {
    const storage = loadStorage();
    return storage.profiles;
  },

  /**
   * Get a specific profile by ID
   */
  get(profileId: string): CredentialProfile | null {
    const storage = loadStorage();
    return storage.profiles.find((p) => p.id === profileId) || null;
  },

  /**
   * Get the currently active profile
   */
  getActive(): CredentialProfile | null {
    const storage = loadStorage();
    if (!storage.activeProfileId) {
      return null;
    }
    return storage.profiles.find((p) => p.id === storage.activeProfileId) || null;
  },

  /**
   * Get active profile's credentials (convenience method)
   */
  getActiveCredentials(): AWSCredentials | null {
    const profile = this.getActive();
    return profile ? profile.credentials : null;
  },

  /**
   * Create a new profile
   */
  create(name: string, credentials: AWSCredentials): CredentialProfile {
    const storage = loadStorage();

    const profile: CredentialProfile = {
      id: generateProfileId(),
      name,
      credentials,
      createdAt: Date.now(),
    };

    storage.profiles.push(profile);
    saveStorage(storage);

    return profile;
  },

  /**
   * Update an existing profile
   */
  update(profileId: string, updates: { name?: string; credentials?: AWSCredentials }): boolean {
    const storage = loadStorage();
    const index = storage.profiles.findIndex((p) => p.id === profileId);

    if (index === -1) {
      return false;
    }

    if (updates.name !== undefined) {
      storage.profiles[index].name = updates.name;
    }
    if (updates.credentials !== undefined) {
      storage.profiles[index].credentials = updates.credentials;
    }

    saveStorage(storage);

    // Emit events if this is the active profile
    if (storage.activeProfileId === profileId) {
      emitCredentialEvent(CREDENTIAL_EVENTS.ACTIVE_PROFILE_CHANGED);
      emitCredentialEvent(CREDENTIAL_EVENTS.CREDENTIALS_CHANGED);
    }

    return true;
  },

  /**
   * Delete a profile
   */
  delete(profileId: string): boolean {
    const storage = loadStorage();
    const index = storage.profiles.findIndex((p) => p.id === profileId);

    if (index === -1) {
      return false;
    }

    storage.profiles.splice(index, 1);

    // Clear active state if deleting active profile
    if (storage.activeProfileId === profileId) {
      storage.activeProfileId = null;
    }

    saveStorage(storage);
    emitCredentialEvent(CREDENTIAL_EVENTS.ACTIVE_PROFILE_CHANGED);
    emitCredentialEvent(CREDENTIAL_EVENTS.CREDENTIALS_CHANGED);

    return true;
  },

  /**
   * Switch to a different profile
   */
  switchTo(profileId: string): boolean {
    const storage = loadStorage();
    const profile = storage.profiles.find((p) => p.id === profileId);

    if (!profile) {
      return false;
    }

    storage.activeProfileId = profileId;
    profile.lastUsedAt = Date.now();

    saveStorage(storage);
    emitCredentialEvent(CREDENTIAL_EVENTS.ACTIVE_PROFILE_CHANGED);
    emitCredentialEvent(CREDENTIAL_EVENTS.CREDENTIALS_CHANGED);

    return true;
  },

  /**
   * Clear the active profile (disconnect)
   */
  clearActive(): void {
    const storage = loadStorage();
    storage.activeProfileId = null;
    saveStorage(storage);

    // Also clear legacy storage
    if (typeof window !== "undefined") {
      localStorage.removeItem(LEGACY_CREDENTIALS_KEY);
    }

    emitCredentialEvent(CREDENTIAL_EVENTS.ACTIVE_PROFILE_CHANGED);
    emitCredentialEvent(CREDENTIAL_EVENTS.CREDENTIALS_CHANGED);
  },

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  /**
   * Check if any profiles exist
   */
  hasProfiles(): boolean {
    const storage = loadStorage();
    return storage.profiles.length > 0;
  },

  /**
   * Check if credentials exist (active profile or legacy)
   */
  hasCredentials(): boolean {
    if (typeof window === "undefined") {
      return false;
    }

    // Check for active profile first
    if (this.getActive()) {
      return true;
    }

    // Fall back to legacy storage
    return localStorage.getItem(LEGACY_CREDENTIALS_KEY) !== null;
  },

  /**
   * Get profile count
   */
  count(): number {
    const storage = loadStorage();
    return storage.profiles.length;
  },

  /**
   * Find profiles by endpoint
   */
  findByEndpoint(endpoint: string): CredentialProfile[] {
    const storage = loadStorage();
    return storage.profiles.filter((p) => p.credentials.endpoint === endpoint);
  },

  // ============================================================================
  // Save/Load (replaces credentialStorage.ts interface)
  // ============================================================================

  /**
   * Save credentials as a profile and activate it
   * Replaces CredentialStorage.save()
   */
  save(credentials: AWSCredentials, profileName?: string): CredentialProfile {
    if (typeof window === "undefined") {
      throw new Error("Cannot save credentials in non-browser environment");
    }

    // Check if we already have a profile with these credentials
    const existingProfiles = this.findByEndpoint(credentials.endpoint);
    const matchingProfile = existingProfiles.find(
      (p) => p.credentials.accessKeyId === credentials.accessKeyId,
    );

    let profile: CredentialProfile;

    if (matchingProfile) {
      // Update existing profile and activate it
      this.update(matchingProfile.id, { credentials });
      this.switchTo(matchingProfile.id);
      profile = matchingProfile;
    } else {
      // Create new profile with auto-generated name if not provided
      const name =
        profileName ||
        `${credentials.endpoint.replace(/^https?:\/\//, "")} - ${credentials.accessKeyId.substring(0, 8)}`;
      profile = this.create(name, credentials);
      this.switchTo(profile.id);
    }

    // Maintain legacy storage for backward compatibility
    localStorage.setItem(LEGACY_CREDENTIALS_KEY, JSON.stringify(credentials));

    return profile;
  },

  /**
   * Load credentials from active profile or legacy storage
   * Replaces CredentialStorage.load()
   */
  load(): AWSCredentials | null {
    if (typeof window === "undefined") {
      return null;
    }

    // First, try to get from active profile
    const activeCredentials = this.getActiveCredentials();
    if (activeCredentials) {
      return activeCredentials;
    }

    // Fall back to legacy storage and migrate
    const stored = localStorage.getItem(LEGACY_CREDENTIALS_KEY);
    if (!stored) return null;

    try {
      const credentials = JSON.parse(stored) as AWSCredentials;

      // Migrate legacy credentials to profiles
      if (credentials.accessKeyId && credentials.endpoint) {
        this.importLegacy(credentials, "Imported");
      }

      return credentials;
    } catch {
      return null;
    }
  },

  /**
   * Clear all credentials
   * Replaces CredentialStorage.clear()
   */
  clear(): void {
    this.clearActive();
  },

  // ============================================================================
  // Migration
  // ============================================================================

  /**
   * Import credentials from legacy storage
   */
  importLegacy(credentials: AWSCredentials, name: string = "Default"): CredentialProfile {
    // Check if a profile with these exact credentials already exists
    const storage = loadStorage();
    const existing = storage.profiles.find(
      (p) =>
        p.credentials.accessKeyId === credentials.accessKeyId &&
        p.credentials.endpoint === credentials.endpoint,
    );

    if (existing) {
      return existing;
    }

    return this.create(name, credentials);
  },
};

// Legacy exports for backward compatibility
export const CredentialStorage = CredentialManager;
export const CredentialProfiles = CredentialManager;
export const PROFILES_EVENTS = CREDENTIAL_EVENTS;
export const AWS_CREDENTIALS_STORAGE_KEY = LEGACY_CREDENTIALS_KEY;
export const AWS_CREDENTIALS_CHANGED_EVENT = CREDENTIAL_EVENTS.CREDENTIALS_CHANGED;
