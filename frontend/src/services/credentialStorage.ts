/**
 * Type-safe localStorage management for AWS credentials
 */

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  endpoint: string;
  addressingStyle?: string;
  verify?: boolean;
}

export const AWS_CREDENTIALS_STORAGE_KEY = "aws_credentials";
export const AWS_CREDENTIALS_CHANGED_EVENT = "awsCredentialsChanged";

function emitCredentialsChangedEvent() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(AWS_CREDENTIALS_CHANGED_EVENT));
}

const STORAGE_KEY = AWS_CREDENTIALS_STORAGE_KEY;

export const CredentialStorage = {
  /**
   * Save AWS credentials to localStorage
   */
  save(credentials: AWSCredentials): void {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
    emitCredentialsChangedEvent();
  },

  /**
   * Load AWS credentials from localStorage
   */
  load(): AWSCredentials | null {
    if (typeof window === "undefined") {
      return null;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    try {
      return JSON.parse(stored) as AWSCredentials;
    } catch {
      return null;
    }
  },

  /**
   * Clear AWS credentials from localStorage
   */
  clear(): void {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
    emitCredentialsChangedEvent();
  },

  /**
   * Check if credentials exist in localStorage
   */
  exists(): boolean {
    if (typeof window === "undefined") {
      return false;
    }

    return localStorage.getItem(STORAGE_KEY) !== null;
  },
};
