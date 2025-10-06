/**
 * Simplified authentication wrapper for API calls
 *
 * The backend handles sessions via HTTP-only cookies, so we only need to:
 * 1. Ensure cookies are included in requests (already done in client.ts)
 * 2. Handle 401 errors by redirecting to settings page
 * 3. Optionally attempt to recreate session if we have stored credentials
 */

import { api, ApiError, ApiRequestOptions } from "./client";
import { CredentialStorage } from "../../services/credentialStorage";
import { SessionManager } from "../../services/sessionManager";
import { toast } from "../../app/toast";

// Track if we're already handling an auth error to prevent loops
let isHandlingAuthError = false;

/**
 * Simple wrapper around api() that handles authentication errors
 *
 * Strategy:
 * 1. Make the API call normally (cookies are already included)
 * 2. If 401 with session error, try to recreate session once
 * 3. If still fails, redirect to settings page
 */
export async function apiWithAuth<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  try {
    // First, try the request normally
    return await api<T>(path, options);
  } catch (error) {
    // Only handle 401 authentication errors
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }

    // Check if this is a session-related error
    const isSessionError =
      error.code === "session_not_found" ||
      error.code === "session_expired" ||
      error.code === "no_session";

    if (!isSessionError) {
      // Not a session error (might be insufficient permissions, etc.)
      throw error;
    }

    // Prevent infinite loops
    if (isHandlingAuthError) {
      throw error;
    }

    // Check if we have stored credentials to try recreating the session
    const storedCredentials = CredentialStorage.load();

    if (!storedCredentials) {
      // No stored credentials, user needs to log in
      handleAuthFailure("Please log in with your AWS credentials");
      throw new Error("Authentication required. Redirecting to settings...");
    }

    // Try to recreate the session once
    isHandlingAuthError = true;

    try {
      // Attempt to create a new session with stored credentials
      await SessionManager.createSession(storedCredentials);

      // Session recreated, retry the original request
      const result = await api<T>(path, options);

      // Success! Notify user their session was refreshed
      toast.push({
        title: "Session restored",
        description: "Your session has been automatically renewed",
        level: "info",
      });

      return result;
    } catch (refreshError) {
      // Failed to recreate session, credentials might be invalid
      CredentialStorage.clear();

      if (
        refreshError instanceof ApiError &&
        (refreshError.code === "invalid_credentials" || refreshError.status === 403)
      ) {
        handleAuthFailure("Your stored credentials are no longer valid. Please log in again.");
      } else {
        handleAuthFailure("Could not restore session. Please log in again.");
      }

      throw new Error("Session refresh failed. Redirecting to settings...");
    } finally {
      isHandlingAuthError = false;
    }
  }
}

/**
 * Handle authentication failure by showing error and redirecting
 */
function handleAuthFailure(message: string) {
  // Show error toast
  toast.push({
    title: "Authentication Required",
    description: message,
    level: "error",
  });

  // Redirect to settings page after a brief delay
  setTimeout(() => {
    // Use location.replace to prevent back button issues
    window.location.replace("/settings");
  }, 1500);
}
