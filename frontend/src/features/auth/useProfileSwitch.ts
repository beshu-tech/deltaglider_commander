/**
 * Hook for handling profile switching with automatic query invalidation
 * Ensures all cached data is cleared when switching between credential profiles
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PROFILES_EVENTS } from "../../services/credentialProfiles";

/**
 * Listens for profile switch events and invalidates all queries
 * This ensures fresh data is fetched with the new credentials
 */
export function useProfileSwitch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleProfileChange = () => {
      // Invalidate all queries to force refetch with new credentials
      queryClient.invalidateQueries();

      console.log("Profile switched - invalidated all cached queries");
    };

    window.addEventListener(PROFILES_EVENTS.ACTIVE_PROFILE_CHANGED, handleProfileChange);

    return () => {
      window.removeEventListener(PROFILES_EVENTS.ACTIVE_PROFILE_CHANGED, handleProfileChange);
    };
  }, [queryClient]);
}
