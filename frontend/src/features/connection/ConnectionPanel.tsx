/**
 * ConnectionPanel - Simplified connection management panel
 * Shows active profile and connection status
 */

import { Database } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useCredentialProfiles } from "../auth/useCredentialProfiles";
import { useAuthStore, selectConnectionState } from "../../stores/authStore";
import { twMerge } from "tailwind-merge";
import { CONNECTION_STATE_BADGE_CLASSES, CONNECTION_STATE_LABELS } from "./connectionStateStyles";

export function ConnectionPanel() {
  const navigate = useNavigate();
  const { activeProfile } = useCredentialProfiles();
  const connectionState = useAuthStore(selectConnectionState);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);

  if (!activeProfile) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        <p>No active profile</p>
        <button
          onClick={() => navigate({ to: "/settings" })}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Configure Credentials
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-5">
      <div className="flex items-start gap-3 pb-5 border-b border-ui-border dark:border-ui-border-dark">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-ui-surface-active text-ui-text-muted dark:bg-ui-surface-active-dark dark:text-ui-text-muted-dark">
          <Database className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-semibold text-ui-text dark:text-ui-text-dark truncate">
              {activeProfile.name}
            </h2>
            <span
              className={twMerge(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                CONNECTION_STATE_BADGE_CLASSES[connectionState],
              )}
            >
              {CONNECTION_STATE_LABELS[connectionState]}
            </span>
          </div>

          <p className="text-xs text-ui-text-muted dark:text-ui-text-subtle truncate font-mono mb-0.5">
            {activeProfile.credentials.endpoint}
          </p>

          <p className="text-xs text-ui-text-muted dark:text-ui-text-subtle truncate font-mono mb-0.5">
            {activeProfile.credentials.accessKeyId}
          </p>

          <p className="text-xs text-ui-text-muted dark:text-ui-text-subtle">
            {activeProfile.credentials.region}
          </p>
        </div>
      </div>

      {connectionStatus?.errorMessage && (
        <div className="mt-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-md">
          <span className="text-sm text-primary-900 dark:text-primary-100">
            {connectionStatus.errorMessage}
          </span>
        </div>
      )}

      <div className="mt-5">
        <button
          onClick={() => navigate({ to: "/settings" })}
          className="w-full px-4 py-2 text-sm font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          Manage Profiles
        </button>
      </div>
    </div>
  );
}
