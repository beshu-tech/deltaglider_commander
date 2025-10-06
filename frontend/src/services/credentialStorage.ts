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

const STORAGE_KEY = "aws_credentials";

export const CredentialStorage = {
  /**
   * Save AWS credentials to localStorage
   */
  save(credentials: AWSCredentials): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
  },

  /**
   * Load AWS credentials from localStorage
   */
  load(): AWSCredentials | null {
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
    localStorage.removeItem(STORAGE_KEY);
  },

  /**
   * Check if credentials exist in localStorage
   */
  exists(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null;
  },
};
