/**
 * Profile switcher component
 * Displays all saved credential profiles and allows switching between them
 */

import { useState } from "react";
import { Check, Plus, Trash2, Edit2 } from "lucide-react";
import { useCredentialProfiles } from "../auth/useCredentialProfiles";
import type { CredentialProfile } from "../../services/credentialProfiles";

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
        console.error("Failed to switch profile");
        alert("Failed to switch profile. Please check your credentials.");
      }
    } catch (error) {
      console.error("Error switching profile:", error);
      alert("Error switching profile. Please try again.");
    } finally {
      setSwitchingId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, profileId: string) => {
    e.stopPropagation();
    e.preventDefault();

    if (deletingId === profileId) {
      // Confirmed - actually delete
      console.log("Attempting to delete profile:", profileId);
      try {
        const success = deleteProfile(profileId);
        console.log("Delete result:", success);
        if (!success) {
          console.error("Failed to delete profile - returned false");
          alert("Failed to delete profile. Please try again.");
        } else {
          console.log("Profile deleted successfully");
        }
      } catch (error) {
        console.error("Error deleting profile:", error);
        alert(
          "Error deleting profile: " + (error instanceof Error ? error.message : "Unknown error"),
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
          No saved profiles yet
        </p>
        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create First Profile
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-4 py-2">
        <h3 className="text-sm font-medium text-ui-text dark:text-ui-text-dark">
          Saved Profiles ({profiles.length})
        </h3>
        {onCreateNew && (
          <button
            onClick={onCreateNew}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
            title="Add new profile"
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
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium truncate ${
                        isActive
                          ? "text-primary-700 dark:text-primary-300"
                          : "text-ui-text dark:text-ui-text-dark"
                      }`}
                    >
                      {profile.name}
                    </span>
                    {isActive && (
                      <Check className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                    )}
                  </div>

                  <div className="mt-1 space-y-0.5">
                    <p className="text-xs text-ui-text-muted dark:text-ui-text-subtle truncate">
                      {profile.credentials.accessKeyId}
                    </p>
                    <p className="text-xs text-ui-text-muted dark:text-ui-text-subtle truncate">
                      {profile.credentials.endpoint}
                    </p>
                    <p className="text-xs text-ui-text-muted dark:text-ui-text-subtle">
                      {profile.credentials.region}
                    </p>
                  </div>

                  {profile.lastUsedAt && (
                    <p className="mt-1 text-xs text-ui-text-muted dark:text-ui-text-subtle">
                      Last used {new Date(profile.lastUsedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {onEditProfile && (
                    <button
                      onClick={(e) => handleEdit(e, profile)}
                      className="p-1.5 text-ui-text-muted hover:text-ui-text hover:bg-ui-surface-secondary dark:hover:bg-gray-700 rounded transition-colors"
                      title="Edit profile"
                      aria-label={`Edit ${profile.name}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {isDeleting ? (
                    <button
                      onClick={(e) => handleDelete(e, profile.id)}
                      className="px-2 py-1.5 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-300 dark:bg-red-900/40 dark:hover:bg-red-900/60 rounded transition-colors animate-pulse"
                      title="Click to confirm deletion"
                    >
                      Delete?
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleDelete(e, profile.id)}
                      className="p-1.5 text-ui-text-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Delete profile"
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
        Click a profile to switch, or create a new one to save multiple S3 endpoints
      </div>
    </div>
  );
}
