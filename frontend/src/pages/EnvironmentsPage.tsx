/**
 * Environments page - Manage credential profiles
 * Displays all profiles as cards with switch/delete actions
 */

import { useState } from "react";
import { Plus, X, Database } from "lucide-react";
import { useCredentialProfiles } from "../features/auth/useCredentialProfiles";
import { useConnectionStore } from "../stores/connectionStore";
import type { ConnState } from "../types/connection";
import { CredentialConfigForm } from "../features/auth/CredentialConfigForm";

const statusIconColors: Record<ConnState, string> = {
  ok: "text-green-500 dark:text-green-400",
  warn: "text-yellow-500 dark:text-yellow-400",
  error: "text-primary-500 dark:text-primary-400",
  offline: "text-gray-400 dark:text-gray-500",
  reconnecting: "text-blue-500 dark:text-blue-400 animate-pulse",
};

const statusLabels: Record<ConnState, string> = {
  ok: "Connected",
  warn: "Warning",
  error: "Error",
  offline: "Offline",
  reconnecting: "Reconnecting",
};

export function EnvironmentsPage() {
  const { profiles, activeProfile, switchProfile, deleteProfile } = useCredentialProfiles();
  const connectionStatus = useConnectionStore((state) => state.status);
  const startPolling = useConnectionStore((state) => state.startPolling);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Auto-show form if no profiles exist
  const [showAddForm, setShowAddForm] = useState(profiles.length === 0);

  const handleSwitch = async (profileId: string) => {
    if (profileId === activeProfile?.id) return;
    setSwitchingId(profileId);
    try {
      await switchProfile(profileId);
      // Start polling after successful switch
      startPolling();
    } catch (error) {
      console.error("Failed to switch profile:", error);
    } finally {
      setSwitchingId(null);
    }
  };

  const handleDelete = async (profileId: string) => {
    if (!window.confirm("Are you sure you want to delete this profile?")) {
      return;
    }
    setDeletingId(profileId);
    try {
      deleteProfile(profileId);
    } catch (error) {
      console.error("Failed to delete profile:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddSuccess = () => {
    setShowAddForm(false);
    // Start polling after first credential is added
    startPolling();
  };

  const isFirstTime = profiles.length === 0 && !showAddForm;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {isFirstTime ? "Welcome to DeltaGlider Commander" : "Your Environments"}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {isFirstTime
            ? "Configure your AWS credentials to get started with S3 bucket management."
            : "Manage your S3 credential profiles. Switch between environments or add new ones."}
        </p>
      </div>

      {/* Add new profile form */}
      {showAddForm ? (
        <div className="mb-8">
          <CredentialConfigForm
            onSuccess={handleAddSuccess}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors dark:bg-primary-700 dark:hover:bg-primary-600"
        >
          <Plus className="h-5 w-5" />
          Add New Profile
        </button>
      )}

      {/* Profile cards grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile) => {
          const isActive = profile.id === activeProfile?.id;
          const isSwitching = switchingId === profile.id;
          const isDeleting = deletingId === profile.id;

          // Only show connection status for active profile
          const effectiveState = isActive ? connectionStatus?.state || "offline" : "offline";
          const statusLabel = statusLabels[effectiveState];
          const iconColor = statusIconColors[effectiveState];
          const region = isActive
            ? connectionStatus?.region || profile.credentials.region || "unknown"
            : profile.credentials.region || "unknown";

          return (
            <div
              key={profile.id}
              className={`relative rounded-lg border-2 p-6 transition-all duration-200 ${
                isActive
                  ? "border-primary-500 bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/20 dark:to-gray-800 shadow-lg"
                  : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
              }`}
            >
              {/* Delete button - top right, only for inactive profiles */}
              {!isActive && profiles.length > 1 && (
                <button
                  onClick={() => handleDelete(profile.id)}
                  disabled={isDeleting || isSwitching}
                  className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-600 dark:hover:text-primary-400 dark:hover:bg-primary-900/20"
                  title="Delete profile"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {/* Active badge - top right */}
              {isActive && (
                <div className="absolute top-3 right-3">
                  <div className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full dark:bg-green-900/30 dark:text-green-400">
                    Active
                  </div>
                </div>
              )}

              {/* Header with icon and name */}
              <div className="flex items-start gap-3 mb-4 mt-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Database icon with status color */}
                  <div className="relative group/status flex-shrink-0">
                    <Database
                      className={`h-5 w-5 ${isActive ? iconColor : "text-gray-400 dark:text-gray-600"}`}
                    />
                    {/* Tooltip for active profiles */}
                    {isActive && (
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover/status:block z-50 pointer-events-none">
                        <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium px-2 py-1 rounded shadow-lg whitespace-nowrap">
                          {statusLabel}
                          {connectionStatus?.errorMessage && ` • ${connectionStatus.errorMessage}`}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Profile name and region */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                      {profile.name || "Unnamed Profile"}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{region}</p>
                  </div>
                </div>
              </div>

              {/* Credentials info - simplified */}
              <div className="space-y-2 mb-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400 font-medium w-24 flex-shrink-0">
                    Access Key:
                  </span>
                  <span className="font-mono text-gray-900 dark:text-white truncate">
                    {profile.credentials.accessKeyId}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400 font-medium w-24 flex-shrink-0">
                    Endpoint:
                  </span>
                  <span className="font-mono text-gray-900 dark:text-white truncate">
                    {profile.credentials.endpoint.replace(/^https?:\/\//, "")}
                  </span>
                </div>
              </div>

              {/* Actions - switch button only for inactive profiles */}
              {!isActive && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleSwitch(profile.id)}
                    disabled={isSwitching || isDeleting}
                    className="w-full px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm dark:bg-primary-700 dark:hover:bg-primary-600"
                  >
                    {isSwitching ? "Switching..." : "Switch to this profile"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {profiles.length === 0 && !showAddForm && (
        <div className="text-center py-12 text-gray-600 dark:text-gray-400">
          <p className="text-lg">No profiles configured yet.</p>
          <p className="text-sm mt-2">Click "Add New Profile" to get started.</p>
        </div>
      )}
    </div>
  );
}
