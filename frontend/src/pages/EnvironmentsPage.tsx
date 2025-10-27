/**
 * Environments page - Manage credential profiles
 * Displays all profiles as cards with switch/delete actions
 */

import { useState } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { useCredentialProfiles } from "../features/auth/useCredentialProfiles";
import { useConnectionStore } from "../stores/connectionStore";
import type { ConnState } from "../types/connection";
import { CredentialConfigForm } from "../features/auth/CredentialConfigForm";

const statusDotColors: Record<ConnState, string> = {
  ok: "bg-green-500 dark:bg-green-400",
  warn: "bg-yellow-500 dark:bg-yellow-400",
  error: "bg-red-500 dark:bg-red-400",
  offline: "bg-gray-400 dark:bg-gray-500",
  reconnecting: "bg-blue-500 dark:bg-blue-400 animate-pulse",
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
          const dotColor = statusDotColors[effectiveState];
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
              {/* Active badge */}
              {isActive && (
                <div className="absolute top-4 right-4">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary-600 text-white text-xs font-medium rounded-full dark:bg-primary-700">
                    <Check className="h-3 w-3" />
                    Active
                  </div>
                </div>
              )}

              {/* Profile info */}
              <div className="space-y-3 mb-6">
                {/* Profile name with status dot */}
                <div className="flex items-center gap-2">
                  {isActive && (
                    <div className="relative group/status flex-shrink-0">
                      <div className={`h-3 w-3 rounded-full ${dotColor}`} />
                      {/* Tooltip */}
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover/status:block z-50 pointer-events-none">
                        <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium px-2 py-1 rounded shadow-lg whitespace-nowrap">
                          {statusLabel}
                          {connectionStatus?.errorMessage && ` • ${connectionStatus.errorMessage}`}
                        </div>
                      </div>
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                    {profile.name || "Unnamed Profile"}
                  </h3>
                </div>

                {/* Credentials info */}
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Access Key ID
                  </div>
                  <div className="text-sm font-mono text-gray-900 dark:text-white truncate">
                    {profile.credentials.accessKeyId}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Endpoint
                  </div>
                  <div className="text-sm font-mono text-gray-900 dark:text-white truncate">
                    {profile.credentials.endpoint.replace(/^https?:\/\//, "")}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Region
                  </div>
                  <div className="text-sm font-mono text-gray-900 dark:text-white">{region}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {!isActive && (
                  <button
                    onClick={() => handleSwitch(profile.id)}
                    disabled={isSwitching || isDeleting}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors dark:bg-primary-700 dark:hover:bg-primary-600"
                  >
                    {isSwitching ? "Switching..." : "Switch to this profile"}
                  </button>
                )}

                {profiles.length > 1 && (
                  <button
                    onClick={() => handleDelete(profile.id)}
                    disabled={isDeleting || isSwitching || isActive}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md disabled:text-gray-400 disabled:cursor-not-allowed transition-colors dark:text-red-400 dark:hover:bg-red-900/20 dark:disabled:text-gray-600"
                    title="Delete profile"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>
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
