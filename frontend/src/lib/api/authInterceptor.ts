/**
 * Authentication interceptor for automatic 401 handling with session refresh
 */

import { api, ApiError, ApiRequestOptions } from './client';
import { CredentialStorage } from '../../services/credentialStorage';
import { SessionManager } from '../../services/sessionManager';

let isRefreshing = false;
let refreshSubscribers: Array<(error?: Error) => void> = [];

function subscribeToRefresh(callback: (error?: Error) => void) {
  refreshSubscribers.push(callback);
}

function notifyRefreshSubscribers(error?: Error) {
  refreshSubscribers.forEach((callback) => callback(error));
  refreshSubscribers = [];
}

/**
 * Wrapper around api() that handles 401 errors with automatic session refresh
 */
export async function apiWithAuth<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  try {
    return await api<T>(path, options);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }

    // Check error code to determine if we should auto-refresh
    const errorCode = error.code;

    if (errorCode !== 'session_not_found' && errorCode !== 'session_expired') {
      // Not a session error, don't auto-refresh
      throw error;
    }

    // Handle session refresh
    if (isRefreshing) {
      // Another request is already refreshing, wait for it
      return new Promise<T>((resolve, reject) => {
        subscribeToRefresh((refreshError) => {
          if (refreshError) {
            reject(refreshError);
          } else {
            // Retry original request after refresh
            api<T>(path, options).then(resolve).catch(reject);
          }
        });
      });
    }

    // Start refresh process
    isRefreshing = true;

    try {
      await SessionManager.refreshSession();
      isRefreshing = false;
      notifyRefreshSubscribers(); // Notify success

      // Retry original request
      return await api<T>(path, options);
    } catch (refreshError) {
      isRefreshing = false;

      // If refresh failed due to invalid credentials or session errors, clear and redirect
      if (
        refreshError instanceof ApiError &&
        (refreshError.status === 403 || refreshError.status === 401) &&
        (refreshError.code === 'invalid_credentials' ||
         refreshError.code === 'session_expired' ||
         refreshError.code === 'session_not_found')
      ) {
        CredentialStorage.clear();
        notifyRefreshSubscribers(refreshError); // Notify failure
        window.location.href = '/settings'; // Redirect to settings page
        throw new Error('Session expired. Please log in again.');
      }

      notifyRefreshSubscribers(refreshError as Error); // Notify failure
      throw refreshError;
    }
  }
}
