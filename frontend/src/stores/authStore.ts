/**
 * Unified authentication and connection state management
 * Combines credential management and connection status in a single reactive store
 * Uses Zustand with persist middleware for automatic localStorage synchronization
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ConnectionStatus } from "../types/connection";

// ============================================================================
// Types
// ============================================================================

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

interface AuthState {
  // Credentials
  profiles: CredentialProfile[];
  activeProfileId: string | null;

  // Connection status
  connectionStatus: ConnectionStatus | null;

  // Computed getters (these will be implemented as store selectors)
  // No functions stored in state - they're defined outside
}

interface AuthActions {
  // Profile management
  addProfile: (name: string, credentials: AWSCredentials) => CredentialProfile;
  removeProfile: (id: string) => void;
  updateProfile: (id: string, updates: { name?: string; credentials?: AWSCredentials }) => void;
  setActiveProfile: (id: string) => void;
  clearActiveProfile: () => void;

  // Connection status
  setConnectionStatus: (status: Partial<ConnectionStatus> | ConnectionStatus | null) => void;

  // Bulk operations
  clearAll: () => void;
}

type AuthStore = AuthState & AuthActions;

// ============================================================================
// Utilities
// ============================================================================

function generateProfileId(): string {
  return `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Store
// ============================================================================

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      profiles: [],
      activeProfileId: null,
      connectionStatus: null,

      // ============================================================================
      // Profile Management Actions
      // ============================================================================

      addProfile: (name: string, credentials: AWSCredentials) => {
        const profile: CredentialProfile = {
          id: generateProfileId(),
          name,
          credentials,
          createdAt: Date.now(),
        };

        set((state) => ({
          profiles: [...state.profiles, profile],
          activeProfileId: profile.id, // Auto-activate new profile
        }));

        return profile;
      },

      removeProfile: (id: string) => {
        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== id),
          // Clear active if we're deleting the active profile
          activeProfileId: state.activeProfileId === id ? null : state.activeProfileId,
        }));
      },

      updateProfile: (id: string, updates: { name?: string; credentials?: AWSCredentials }) => {
        set((state) => ({
          profiles: state.profiles.map((p) => {
            if (p.id !== id) return p;
            return {
              ...p,
              ...(updates.name !== undefined && { name: updates.name }),
              ...(updates.credentials !== undefined && { credentials: updates.credentials }),
            };
          }),
        }));
      },

      setActiveProfile: (id: string) => {
        const profile = get().profiles.find((p) => p.id === id);
        if (!profile) {
          console.warn(`[authStore] Profile ${id} not found`);
          return;
        }

        set((state) => ({
          activeProfileId: id,
          profiles: state.profiles.map((p) => (p.id === id ? { ...p, lastUsedAt: Date.now() } : p)),
        }));
      },

      clearActiveProfile: () => {
        set({
          activeProfileId: null,
          connectionStatus: null,
        });
      },

      // ============================================================================
      // Connection Status Actions
      // ============================================================================

      setConnectionStatus: (status: Partial<ConnectionStatus> | ConnectionStatus | null) => {
        if (status === null) {
          set({ connectionStatus: null });
        } else {
          set((state) => ({
            connectionStatus: state.connectionStatus
              ? { ...state.connectionStatus, ...status }
              : (status as ConnectionStatus),
          }));
        }
      },

      // ============================================================================
      // Bulk Operations
      // ============================================================================

      clearAll: () => {
        set({
          profiles: [],
          activeProfileId: null,
          connectionStatus: null,
        });
      },
    }),
    {
      name: "auth-storage",
      // Only persist credentials and active profile, not connection status
      partialize: (state) => ({
        profiles: state.profiles,
        activeProfileId: state.activeProfileId,
      }),
    },
  ),
);

// ============================================================================
// Computed Selectors (use these instead of storing functions in state)
// ============================================================================

/**
 * Get the currently active profile
 */
export function selectActiveProfile(state: AuthStore): CredentialProfile | null {
  if (!state.activeProfileId) return null;
  return state.profiles.find((p) => p.id === state.activeProfileId) ?? null;
}

/**
 * Get active profile's credentials
 */
export function selectActiveCredentials(state: AuthStore): AWSCredentials | null {
  const profile = selectActiveProfile(state);
  return profile?.credentials ?? null;
}

/**
 * Check if there's an active profile
 */
export function selectHasActiveProfile(state: AuthStore): boolean {
  return selectActiveProfile(state) !== null;
}

/**
 * Check if any profiles exist
 */
export function selectHasProfiles(state: AuthStore): boolean {
  return state.profiles.length > 0;
}

/**
 * Get connection status state (idle, connected, error, checking)
 */
export function selectConnectionState(state: AuthStore): ConnectionStatus["state"] {
  return state.connectionStatus?.state ?? "idle";
}
