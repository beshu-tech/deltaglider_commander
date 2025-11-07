/**
 * Environments page - Manage credential environments
 * Displays all environments as cards with switch/edit/delete actions
 */

import { useState } from "react";
import { Plus, X, Database, Pencil } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useCredentialProfiles } from "../features/auth/useCredentialProfiles";
import { useAuthStore } from "../stores/authStore";
import { CredentialConfigForm } from "../features/auth/CredentialConfigForm";
import {
  CONNECTION_STATE_ICON_CLASSES,
  CONNECTION_STATE_LABELS,
} from "../features/connection/connectionStateStyles";
import { DEFAULT_REGION_LABEL, DEFAULT_ENDPOINT_LABEL } from "../lib/constants/aws";

export function EnvironmentsPage() {
  const navigate = useNavigate();
  const { profiles, activeProfile, switchProfile, deleteProfile } = useCredentialProfiles();
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);
  // Auto-show form if no profiles exist
  const [showAddForm, setShowAddForm] = useState(profiles.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSwitch = async (profileId: string) => {
    if (profileId === activeProfile?.id) return;
    setSwitchingId(profileId);
    setSwitchError(null);
    try {
      const success = await switchProfile(profileId);
      if (success) {
        // Navigate to buckets page after successful switch
        navigate({ to: "/buckets" });
      } else {
        setSwitchError("Failed to switch environment. Please check your credentials.");
      }
    } catch (error) {
      console.error("Failed to switch profile:", error);
      setSwitchError(error instanceof Error ? error.message : "Failed to switch environment");
    } finally {
      setSwitchingId(null);
    }
  };

  const handleDelete = async (profileId: string) => {
    if (!window.confirm("Are you sure you want to delete this environment?")) {
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
    setEditingId(null);
    // Polling is handled automatically by TanStack Query
  };

  const handleEdit = (profileId: string) => {
    setEditingId(profileId);
    setShowAddForm(false);
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
            : "Manage your S3 credential environments. Switch between environments or add new ones."}
        </p>
      </div>

      {/* Switch error message */}
      {switchError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          <p className="font-medium">Failed to switch environment</p>
          <p className="text-sm mt-1">{switchError}</p>
        </div>
      )}

      {/* Add new environment form or edit existing */}
      {showAddForm || editingId ? (
        <div className="mb-8">
          <CredentialConfigForm
            onSuccess={handleAddSuccess}
            onCancel={() => {
              setShowAddForm(false);
              setEditingId(null);
            }}
            editProfileId={editingId || undefined}
          />
        </div>
      ) : (
        <button
          data-testid="environments-button-add-new"
          onClick={() => setShowAddForm(true)}
          className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors dark:bg-primary-700 dark:hover:bg-primary-600"
        >
          <Plus className="h-5 w-5" />
          Add New Environment
        </button>
      )}

      {/* Environment cards grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile) => {
          const isActive = profile.id === activeProfile?.id;
          const isSwitching = switchingId === profile.id;
          const isDeleting = deletingId === profile.id;

          // Only show connection status for active environment
          const effectiveState = isActive ? connectionStatus?.state || "offline" : "offline";
          const statusLabel = CONNECTION_STATE_LABELS[effectiveState];
          const iconColor = CONNECTION_STATE_ICON_CLASSES[effectiveState];
          const region = isActive
            ? connectionStatus?.region || profile.credentials.region || DEFAULT_REGION_LABEL
            : profile.credentials.region || DEFAULT_REGION_LABEL;

          return (
            <div
              key={profile.id}
              data-testid={`environment-card-${profile.id}`}
              className={`relative rounded-lg border-2 p-6 transition-all duration-200 ${
                isActive
                  ? "border-primary-500 bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/20 dark:to-gray-800 shadow-lg"
                  : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
              }`}
            >
              {/* Action buttons - top right */}
              {!isActive && profiles.length > 1 && (
                <div className="absolute top-3 right-3 flex gap-1">
                  <button
                    data-testid={`environment-button-edit-${profile.id}`}
                    onClick={() => handleEdit(profile.id)}
                    disabled={isDeleting || isSwitching}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-600 dark:hover:text-primary-400 dark:hover:bg-primary-900/20"
                    title="Edit environment"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    data-testid={`environment-button-delete-${profile.id}`}
                    onClick={() => handleDelete(profile.id)}
                    disabled={isDeleting || isSwitching}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-600 dark:hover:text-red-400 dark:hover:bg-red-900/20"
                    title="Delete environment"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Edit button for active environment */}
              {isActive && (
                <div className="absolute top-3 right-14">
                  <button
                    data-testid={`environment-button-edit-${profile.id}`}
                    onClick={() => handleEdit(profile.id)}
                    disabled={isDeleting || isSwitching}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-600 dark:hover:text-primary-400 dark:hover:bg-primary-900/20"
                    title="Edit environment"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
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
                    {/* Tooltip for active environment */}
                    {isActive && (
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover/status:block z-50 pointer-events-none">
                        <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium px-2 py-1 rounded shadow-lg whitespace-nowrap">
                          {statusLabel}
                          {connectionStatus?.errorMessage && ` • ${connectionStatus.errorMessage}`}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Environment name and region */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                      {profile.name || "Unnamed Environment"}
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
                    {profile.credentials.endpoint
                      ? profile.credentials.endpoint.replace(/^https?:\/\//, "")
                      : DEFAULT_ENDPOINT_LABEL}
                  </span>
                </div>
              </div>

              {/* Actions - switch button only for inactive environments */}
              {!isActive && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    data-testid={`environment-button-switch-${profile.id}`}
                    onClick={() => handleSwitch(profile.id)}
                    disabled={isSwitching || isDeleting}
                    className="w-full px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm dark:bg-primary-700 dark:hover:bg-primary-600"
                  >
                    {isSwitching ? "Switching..." : "Switch to this environment"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {profiles.length === 0 && !showAddForm && (
        <div className="text-center py-12 text-gray-600 dark:text-gray-400">
          <p className="text-lg">No environments configured yet.</p>
          <p className="text-sm mt-2">Click "Add New Environment" to get started.</p>
        </div>
      )}
    </div>
  );
}
