/**
 * Environment switcher component
 * Displays all saved environments and allows switching between them
 */

import { useState } from "react";
import { Plus, Trash2, Edit2, Database } from "lucide-react";
import { useCredentialProfiles } from "../auth/useCredentialProfiles";
import type { CredentialProfile } from "../../stores/authStore";

interface ProfileSwitcherProps {
  onCreateNew?: () => void;
  onEditProfile?: (profile: CredentialProfile) => void;
}

export function ProfileSwitcher({ onCreateNew, onEditProfile }: ProfileSwitcherProps) {
  const { profiles, activeProfile, switchProfile, deleteProfile } = useCredentialProfiles();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const handleSwitch = async (profileId: string) => {
    if (profileId === activeProfile?.id) {
      // Already active, nothing to do
      return;
    }

    if (switchingId) {
      // Already switching, ignore
      return;
    }

    setSwitchingId(profileId);
    try {
      const success = await switchProfile(profileId);
      if (!success) {
        console.error("Failed to switch environment");
        alert("Failed to switch environment. Please check your credentials.");
      }
    } catch (error) {
      console.error("Error switching environment:", error);
      alert("Error switching environment. Please try again.");
    } finally {
      setSwitchingId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, profileId: string) => {
    e.stopPropagation();
    e.preventDefault();

    if (deletingId === profileId) {
      // Confirmed - actually delete
      console.log("Attempting to delete environment:", profileId);
      try {
        deleteProfile(profileId);
        console.log("Environment deleted successfully");
      } catch (error) {
        console.error("Error deleting environment:", error);
        alert(
          "Error deleting environment: " + (error instanceof Error ? error.message : "Unknown error"),
        );
      } finally {
        setDeletingId(null);
      }
    } else {
      // First click - show confirmation
      console.log("Delete confirmation requested for:", profileId);
      setDeletingId(profileId);
      // Reset after 3 seconds
      setTimeout(() => {
        console.log("Delete confirmation timeout, resetting");
        setDeletingId(null);
      }, 3000);
    }
  };

  const handleEdit = (e: React.MouseEvent, profile: CredentialProfile) => {
    e.stopPropagation();
    e.preventDefault();
    onEditProfile?.(profile);
  };

  if (profiles.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-ui-text-muted dark:text-ui-text-subtle mb-4">
          No saved environments yet
        </p>
        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create First Environment
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-4 py-2">
        <h3 className="text-sm font-medium text-ui-text dark:text-ui-text-dark">
          Saved Environments ({profiles.length})
        </h3>
        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
            title="Add new environment"
          >
            <Plus className="w-3 h-3" />
            New
          </button>
        )}
      </div>

      <div className="space-y-1 max-h-80 overflow-y-auto">
        {profiles.map((profile) => {
          const isActive = activeProfile?.id === profile.id;
          const isDeleting = deletingId === profile.id;
          const isSwitching = switchingId === profile.id;

          return (
            <div
              key={profile.id}
              onClick={() => handleSwitch(profile.id)}
              className={`
                w-full px-4 py-3 transition-colors
                ${isSwitching ? "cursor-wait opacity-60" : "cursor-pointer"}
                ${
                  isActive
                    ? "bg-primary-50 dark:bg-primary-900/30 border-l-4 border-primary-600"
                    : "hover:bg-ui-surface-secondary dark:hover:bg-gray-800 border-l-4 border-transparent"
                }
              `}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Status indicator icon */}
                  <Database
                    className={`h-4 w-4 flex-shrink-0 ${
                      isActive
                        ? "text-green-500 dark:text-green-400"
                        : "text-gray-400 dark:text-gray-600"
                    }`}
                  />

                  {/* Environment info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ui-text dark:text-ui-text-dark truncate">
                      {profile.name}
                    </div>
                    <div className="text-xs text-ui-text-muted dark:text-ui-text-subtle">
                      {profile.credentials.region}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {onEditProfile && (
                    <button
                      onClick={(e) => handleEdit(e, profile)}
                      className="p-1.5 text-ui-text-muted hover:text-ui-text hover:bg-ui-surface-secondary dark:hover:bg-gray-700 rounded transition-colors"
                      title="Edit environment"
                      aria-label={`Edit ${profile.name}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {isDeleting ? (
                    <button
                      onClick={(e) => handleDelete(e, profile.id)}
                      className="px-2 py-1.5 text-xs font-medium text-primary-700 bg-primary-100 hover:bg-primary-200 dark:text-primary-300 dark:bg-primary-900/40 dark:hover:bg-primary-900/60 rounded transition-colors animate-pulse"
                      title="Click to confirm deletion"
                    >
                      Delete?
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleDelete(e, profile.id)}
                      className="p-1.5 text-ui-text-muted hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                      title="Delete environment"
                      aria-label={`Delete ${profile.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-2 text-xs text-ui-text-muted dark:text-ui-text-subtle border-t border-ui-border dark:border-ui-border-dark">
        Click an environment to switch, or create a new one to save multiple S3 endpoints
      </div>
    </div>
  );
}
