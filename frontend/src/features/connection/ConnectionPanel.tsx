/**
 * Connection panel with header and 4 sections
 * Header: Server info, credentials, current profile with status badge
 * 1. Saved Profiles - Manage multiple credential profiles
 * 2. Actions - Reconnect, Test, Rotate
 * 3. Activity Log - Recent events
 * 4. Advanced - Token expiry, diagnostics
 */

import { useEffect, useState } from "react";
import { RefreshCw, TestTube, Key, AlertTriangle, Clock, Database } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { useNavigate } from "@tanstack/react-router";
import { useConnectionStore } from "../../stores/connectionStore";
import { Accordion } from "../../lib/ui/Accordion";
import { ProfileSwitcher } from "./ProfileSwitcher";
import { ProfileEditModal } from "./ProfileEditModal";
import { useCredentialProfiles } from "../auth/useCredentialProfiles";
import type { ConnState } from "../../types/connection";
import type { CredentialProfile } from "../../services/credentialProfiles";

const stateLabels: Record<ConnState, string> = {
  ok: "Connected",
  warn: "Warning",
  error: "Error",
  offline: "Offline",
  reconnecting: "Reconnecting",
};

export function ConnectionPanel() {
  const navigate = useNavigate();
  const status = useConnectionStore((state) => state.status);
  const activity = useConnectionStore((state) => state.activity);
  const reconnect = useConnectionStore((state) => state.reconnect);
  const startPolling = useConnectionStore((state) => state.startPolling);
  const setSheetOpen = useConnectionStore((state) => state.setSheetOpen);
  const { hasProfiles, updateProfile, activeProfile } = useCredentialProfiles();

  const [editingProfile, setEditingProfile] = useState<CredentialProfile | null>(null);

  // Start polling when panel mounts
  useEffect(() => {
    startPolling();
  }, [startPolling]);

  if (!status) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        No connection information available
      </div>
    );
  }

  const isExpiringSoon = status.expiresAt
    ? new Date(status.expiresAt).getTime() - Date.now() < 15 * 60 * 1000
    : false;

  return (
    <div className="flex flex-col h-full">
      {/* Header - Server & Profile Info */}
      <div className="p-5 border-b border-ui-border dark:border-ui-border-dark">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-ui-surface-active text-ui-text-muted dark:bg-ui-surface-active-dark dark:text-ui-text-muted-dark">
            <Database className="h-5 w-5" />
          </span>

          {/* Server & Profile Info */}
          <div className="min-w-0 flex-1">
            {/* Profile Name */}
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-base font-semibold text-ui-text dark:text-ui-text-dark truncate">
                {activeProfile?.name || "Connected"}
              </h2>
              <span
                className={twMerge(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                  status.state === "ok" &&
                    "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
                  status.state === "warn" &&
                    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
                  status.state === "error" &&
                    "bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-300",
                  status.state === "offline" &&
                    "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300",
                  status.state === "reconnecting" &&
                    "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
                )}
              >
                {stateLabels[status.state]}
              </span>
            </div>

            {/* Endpoint */}
            <p className="text-xs text-ui-text-muted dark:text-ui-text-subtle truncate font-mono mb-0.5">
              {status.endpoint}
            </p>

            {/* Access Key */}
            <p className="text-xs text-ui-text-muted dark:text-ui-text-subtle truncate font-mono mb-0.5">
              {status.accessKeyId}
            </p>

            {/* Region & Provider */}
            <p className="text-xs text-ui-text-muted dark:text-ui-text-subtle">
              {status.region} • {status.provider.toUpperCase()}
              {status.accountAlias && ` • ${status.accountAlias}`}
            </p>
          </div>
        </div>

        {/* Error message */}
        {status.errorMessage && (
          <div className="flex items-start gap-2 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-md mt-3">
            <AlertTriangle className="w-4 h-4 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-primary-900 dark:text-primary-100">
              {status.errorMessage}
            </span>
          </div>
        )}

        {/* Expiry warning */}
        {isExpiringSoon && status.expiresAt && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md mt-3">
            <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-yellow-900 dark:text-yellow-100">
              Token expires in {formatTimeRemaining(status.expiresAt)}
            </span>
          </div>
        )}
      </div>

      {/* Section 1: Saved Profiles */}
      {hasProfiles && (
        <Accordion title="Saved Profiles" subtitle="Switch between credential profiles">
          <ProfileSwitcher
            onCreateNew={() => {
              setSheetOpen(false);
              navigate({ to: "/settings" });
            }}
            onEditProfile={(profile) => setEditingProfile(profile)}
          />
        </Accordion>
      )}

      {/* Section 2: Actions */}
      <Accordion title="Actions" subtitle="Manage your connection" defaultOpen>
        <div className="space-y-2">
          <button
            onClick={reconnect}
            disabled={status.state === "reconnecting"}
            className={twMerge(
              "w-full flex items-center gap-2 px-4 py-2",
              "text-sm font-medium",
              "bg-blue-50 dark:bg-blue-900/20",
              "text-blue-900 dark:text-blue-100",
              "rounded-md",
              "hover:bg-blue-100 dark:hover:bg-blue-900/30",
              "transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900",
            )}
          >
            <RefreshCw
              className={twMerge("w-4 h-4", status.state === "reconnecting" && "animate-spin")}
            />
            {status.state === "reconnecting" ? "Reconnecting..." : "Reconnect"}
          </button>

          <button
            className={twMerge(
              "w-full flex items-center gap-2 px-4 py-2",
              "text-sm font-medium",
              "bg-gray-50 dark:bg-gray-800",
              "text-gray-900 dark:text-gray-100",
              "rounded-md",
              "hover:bg-gray-100 dark:hover:bg-gray-700",
              "transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900",
            )}
          >
            <TestTube className="w-4 h-4" />
            Test Connection
          </button>

          <button
            className={twMerge(
              "w-full flex items-center gap-2 px-4 py-2",
              "text-sm font-medium",
              "bg-gray-50 dark:bg-gray-800",
              "text-gray-900 dark:text-gray-100",
              "rounded-md",
              "hover:bg-gray-100 dark:hover:bg-gray-700",
              "transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900",
            )}
          >
            <Key className="w-4 h-4" />
            Rotate Credentials
          </button>
        </div>
      </Accordion>

      {/* Section 3: Activity Log */}
      <Accordion title="Activity Log" subtitle={`${activity.length} recent events`}>
        {activity.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">No recent activity</div>
        ) : (
          <div className="space-y-2">
            {activity.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-2 rounded-md bg-gray-50 dark:bg-gray-800"
              >
                <div className="flex-1">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTimestamp(item.timestamp)}
                  </div>
                  <div className="text-sm text-gray-900 dark:text-gray-100 mt-0.5">
                    {item.message}
                  </div>
                </div>
                <span
                  className={twMerge(
                    "text-xs px-2 py-0.5 rounded-full",
                    item.event === "error" &&
                      "bg-primary-100 dark:bg-primary-900/20 text-primary-900 dark:text-primary-100",
                    item.event === "connected" &&
                      "bg-green-100 dark:bg-green-900/20 text-green-900 dark:text-green-100",
                    item.event === "disconnected" &&
                      "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100",
                    (item.event === "rotated" || item.event === "reconnected") &&
                      "bg-blue-100 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100",
                  )}
                >
                  {item.event}
                </span>
              </div>
            ))}
          </div>
        )}
      </Accordion>

      {/* Section 4: Advanced */}
      <Accordion title="Advanced" subtitle="Diagnostics and details">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Last Checked</label>
            <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {formatTimestamp(status.lastChecked)}
            </div>
          </div>

          {status.expiresAt && (
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400">Token Expires</label>
              <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                {formatTimestamp(status.expiresAt)}
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  ({formatTimeRemaining(status.expiresAt)})
                </span>
              </div>
            </div>
          )}
        </div>
      </Accordion>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        open={!!editingProfile}
        profile={editingProfile}
        onSave={(profileId, updates) => {
          updateProfile(profileId, updates);
          setEditingProfile(null);
        }}
        onCancel={() => setEditingProfile(null)}
      />
    </div>
  );
}

// Helper functions
function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString();
}

function formatTimeRemaining(expiresAt: string): string {
  const remaining = new Date(expiresAt).getTime() - Date.now();
  const minutes = Math.floor(remaining / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}
