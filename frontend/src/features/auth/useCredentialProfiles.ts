/**
 * React hook for managing credential profiles
 * Provides access to profile CRUD operations and active profile state
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  CredentialProfiles,
  PROFILES_EVENTS,
  type CredentialProfile,
} from "../../services/credentialProfiles";
import { SessionManager } from "../../services/sessionManager";
import type { AWSCredentials } from "../../services/credentialStorage";

// External store for profile changes
function subscribe(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener(PROFILES_EVENTS.ACTIVE_PROFILE_CHANGED, callback);
  return () => {
    window.removeEventListener(PROFILES_EVENTS.ACTIVE_PROFILE_CHANGED, callback);
  };
}

function getSnapshot(): number {
  // Return a changing value when profiles change
  return Date.now();
}

function getServerSnapshot(): number {
  return 0;
}

export function useCredentialProfiles() {
  // Subscribe to profile changes
  const changeTimestamp = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Local state for profiles list (updated when changeTimestamp changes)
  const [profiles, setProfiles] = useState<CredentialProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<CredentialProfile | null>(null);

  // Load profiles when change timestamp updates
  useEffect(() => {
    setProfiles(CredentialProfiles.list());
    setActiveProfile(CredentialProfiles.getActive());
  }, [changeTimestamp]);

  // Create a new profile
  const createProfile = useCallback((name: string, credentials: AWSCredentials) => {
    return CredentialProfiles.create(name, credentials);
  }, []);

  // Update a profile
  const updateProfile = useCallback(
    (profileId: string, updates: { name?: string; credentials?: AWSCredentials }) => {
      return CredentialProfiles.update(profileId, updates);
    },
    [],
  );

  // Delete a profile
  const deleteProfile = useCallback((profileId: string) => {
    return CredentialProfiles.delete(profileId);
  }, []);

  // Switch to a different profile
  const switchProfile = useCallback(async (profileId: string) => {
    const success = CredentialProfiles.switchTo(profileId);
    if (!success) {
      return false;
    }

    // Get the newly active profile's credentials
    const profile = CredentialProfiles.get(profileId);
    if (!profile) {
      return false;
    }

    try {
      // Create a new session with the switched credentials
      await SessionManager.createSession(profile.credentials);
      return true;
    } catch (error) {
      console.error("Failed to create session with new profile:", error);
      // Revert the profile switch
      CredentialProfiles.clearActive();
      return false;
    }
  }, []);

  // Disconnect (clear active profile)
  const disconnect = useCallback(() => {
    CredentialProfiles.clearActive();
  }, []);

  // Get a specific profile
  const getProfile = useCallback((profileId: string) => {
    return CredentialProfiles.get(profileId);
  }, []);

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
