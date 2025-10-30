/**
 * Hook for handling profile switching with automatic query invalidation
 * Ensures all cached data is cleared when switching between credential profiles
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";

/**
 * Listens for profile switch events and invalidates all queries
 * This ensures fresh data is fetched with the new credentials
 */
export function useProfileSwitch() {
  const queryClient = useQueryClient();
  const activeProfileId = useAuthStore((state) => state.activeProfileId);

  useEffect(() => {
    // Invalidate all queries when active profile changes
    queryClient.invalidateQueries();
    console.log("Profile switched - invalidated all cached queries");
  }, [activeProfileId, queryClient]);
}
