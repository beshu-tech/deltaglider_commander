/**
 * Session lifecycle management for AWS credentials
 */

import { api, ApiError } from "../lib/api/client";
import { useAuthStore, selectActiveCredentials, type AWSCredentials } from "../stores/authStore";

export interface SessionError {
  code: string;
  message: string;
}

export interface SessionStatusResponse {
  valid: boolean;
  expires_in?: number;
}

/**
 * Backend API credential format (snake_case)
 */
interface TransformedCredentials {
  access_key_id: string;
  secret_access_key: string;
  region: string;
  endpoint: string;
  addressing_style?: string;
  verify?: boolean;
}

/**
 * Transform camelCase credentials to snake_case for backend API
 */
function transformCredentials(creds: AWSCredentials): TransformedCredentials {
  return {
    access_key_id: creds.accessKeyId,
    secret_access_key: creds.secretAccessKey,
    region: creds.region,
    endpoint: creds.endpoint,
    addressing_style: creds.addressingStyle,
    verify: creds.verify,
  };
}

export const SessionManager = {
  /**
   * Create a new session with AWS credentials
   */
  async createSession(credentials: AWSCredentials): Promise<void> {
    try {
      await api("/api/auth/session", {
        method: "POST",
        body: JSON.stringify({ credentials: transformCredentials(credentials) }),
        credentials: "include", // Include cookies
      });

      // Note: Profile management is handled by the caller (UI components)
      // This service only manages the backend session
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        const details = error.details as { message?: string } | undefined;
        throw new Error(details?.message || error.message || "Invalid credentials");
      }
      throw error;
    }
  },

  /**
   * Refresh session using stored credentials
   */
  async refreshSession(): Promise<void> {
    const credentials = selectActiveCredentials(useAuthStore.getState());

    if (!credentials) {
      throw new Error("No stored credentials for refresh");
    }

    await api("/api/auth/session", {
      method: "POST",
      body: JSON.stringify({ credentials: transformCredentials(credentials) }),
      credentials: "include",
    });
  },

  /**
   * Destroy current session and clear credentials
   */
  async destroySession(): Promise<void> {
    try {
      await api("/api/auth/session", {
        method: "DELETE",
        credentials: "include",
      });
    } finally {
      // Always clear credentials even if request fails
      useAuthStore.getState().clearActiveProfile();
    }
  },

  /**
   * Check current session status
   */
  async checkStatus(): Promise<SessionStatusResponse> {
    return await api<SessionStatusResponse>("/api/auth/session/status", {
      method: "GET",
      credentials: "include",
    });
  },
};
