/**
 * React hook for managing credential profiles
 * Provides access to profile CRUD operations and active profile state
 */

import { useCallback } from "react";
import { useAuthStore, selectActiveProfile, type AWSCredentials } from "../../stores/authStore";
import { SessionManager } from "../../services/sessionManager";

export function useCredentialProfiles() {
  // Get state from authStore
  const profiles = useAuthStore((state) => state.profiles);
  const activeProfile = useAuthStore(selectActiveProfile);
  const addProfile = useAuthStore((state) => state.addProfile);
  const updateProfileAction = useAuthStore((state) => state.updateProfile);
  const removeProfile = useAuthStore((state) => state.removeProfile);
  const setActiveProfile = useAuthStore((state) => state.setActiveProfile);
  const clearActiveProfile = useAuthStore((state) => state.clearActiveProfile);

  // Create a new profile
  const createProfile = useCallback(
    (name: string, credentials: AWSCredentials) => {
      return addProfile(name, credentials);
    },
    [addProfile],
  );

  // Update a profile
  const updateProfile = useCallback(
    (profileId: string, updates: { name?: string; credentials?: AWSCredentials }) => {
      updateProfileAction(profileId, updates);
    },
    [updateProfileAction],
  );

  // Delete a profile
  const deleteProfile = useCallback(
    (profileId: string) => {
      removeProfile(profileId);
    },
    [removeProfile],
  );

  // Switch to a different profile
  const switchProfile = useCallback(
    async (profileId: string) => {
      const profile = profiles.find((p) => p.id === profileId);
      if (!profile) {
        return false;
      }

      try {
        // Create a new session with the switched credentials
        await SessionManager.createSession(profile.credentials);
        setActiveProfile(profileId);
        return true;
      } catch (error) {
        console.error("Failed to create session with new profile:", error);
        return false;
      }
    },
    [profiles, setActiveProfile],
  );

  // Disconnect (clear active profile)
  const disconnect = useCallback(() => {
    clearActiveProfile();
  }, [clearActiveProfile]);

  // Get a specific profile
  const getProfile = useCallback(
    (profileId: string) => {
      return profiles.find((p) => p.id === profileId) || null;
    },
    [profiles],
  );

  return {
    profiles,
    activeProfile,
    hasProfiles: profiles.length > 0,
    profileCount: profiles.length,
    createProfile,
    updateProfile,
    deleteProfile,
    switchProfile,
    disconnect,
    getProfile,
  };
}
