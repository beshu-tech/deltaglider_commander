/**
 * Hook to check and manage credential state
 */

import { useState, useEffect } from 'react';
import { CredentialStorage } from '../../services/credentialStorage';

export function useCredentials() {
  const [hasCredentials, setHasCredentials] = useState<boolean>(
    () => CredentialStorage.exists(),
  );

  // Listen for storage events from other tabs
  useEffect(() => {
    function handleStorageChange(event: StorageEvent) {
      if (event.key === 'aws_credentials') {
        setHasCredentials(event.newValue !== null);
      }
    }

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const markCredentialsSet = () => setHasCredentials(true);
  const clearCredentials = () => {
    CredentialStorage.clear();
    setHasCredentials(false);
  };

  return {
    hasCredentials,
    markCredentialsSet,
    clearCredentials,
  };
}
