/**
 * Hook to check and manage credential state
 */

import { useAuthStore, selectHasActiveProfile } from "../../stores/authStore";

export function useCredentials() {
  const hasCredentials = useAuthStore(selectHasActiveProfile);
  const clearActiveProfile = useAuthStore((state) => state.clearActiveProfile);

  return {
    hasCredentials,
    markCredentialsSet: () => {
      // No-op: credentials are set when addProfile is called from UI
    },
    clearCredentials: clearActiveProfile,
  };
}
