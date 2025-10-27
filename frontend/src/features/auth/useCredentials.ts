/**
 * Hook to check and manage credential state
 */

import { useState, useEffect } from "react";
import { CredentialManager, AWS_CREDENTIALS_STORAGE_KEY } from "../../services/credentials";

export function useCredentials() {
  const [hasCredentials, setHasCredentials] = useState<boolean>(() =>
    CredentialManager.hasCredentials(),
  );

  // Listen for storage events from other tabs
  useEffect(() => {
    function handleStorageChange(event: StorageEvent) {
      if (event.key === AWS_CREDENTIALS_STORAGE_KEY) {
        setHasCredentials(event.newValue !== null);
      }
    }

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const markCredentialsSet = () => setHasCredentials(true);
  const clearCredentials = () => {
    CredentialManager.clear();
    setHasCredentials(false);
  };

  return {
    hasCredentials,
    markCredentialsSet,
    clearCredentials,
  };
}
