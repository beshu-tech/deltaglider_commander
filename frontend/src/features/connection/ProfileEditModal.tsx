/**
 * Profile edit modal
 * Allows editing profile name and credentials
 */

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "../../lib/ui/Button";
import { escapeStack } from "../objects/logic/escapeStack";
import type { CredentialProfile } from "../../services/credentialProfiles";
import type { AWSCredentials } from "../../services/credentialStorage";

interface ProfileEditModalProps {
  open: boolean;
  profile: CredentialProfile | null;
  onSave: (profileId: string, updates: { name?: string; credentials?: AWSCredentials }) => void;
  onCancel: () => void;
}

/**
 * Modal for editing profile name and optionally credentials
 */
export function ProfileEditModal({ open, profile, onSave, onCancel }: ProfileEditModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(profile?.name ?? "");
  const [error, setError] = useState<string | null>(null);

  // Update local state when profile changes
  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setError(null);
    }
  }, [profile]);

  // Register with Escape stack
  useEffect(() => {
    if (!open) return;

    const unregister = escapeStack.register(() => {
      onCancel();
      return true; // Consumed
    });

    return unregister;
  }, [open, onCancel]);

  // Focus name input when modal opens
  useEffect(() => {
    if (open && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [open]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Profile name cannot be empty");
      return;
    }

    onSave(profile.id, { name: trimmedName });
    onCancel();
  };

  if (!open || !profile) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative z-10 w-full max-w-md rounded-lg border border-ui-border bg-white p-6 shadow-lg dark:border-ui-border-dark dark:bg-ui-surface-dark"
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <h2
            id="modal-title"
            className="text-xl font-semibold text-ui-text dark:text-ui-text-dark"
          >
            Edit Profile
          </h2>
          <button
            onClick={onCancel}
            className="rounded-md p-1 text-ui-text-muted hover:bg-ui-surface-hover hover:text-ui-text dark:text-ui-text-subtle dark:hover:bg-ui-surface-hover-dark dark:hover:text-ui-text-dark"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="profile-name"
              className="block text-sm font-medium text-ui-text dark:text-ui-text-dark mb-2"
            >
              Profile Name
            </label>
            <input
              ref={nameInputRef}
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              className="w-full px-3 py-2 border border-ui-border dark:border-ui-border-dark rounded-md bg-white dark:bg-ui-surface-active-dark text-ui-text dark:text-ui-text-dark focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="My S3 Profile"
            />
            {error && (
              <p className="mt-1 text-sm text-primary-600 dark:text-primary-400">{error}</p>
            )}
          </div>

          {/* Credential preview (read-only) */}
          <div className="rounded-md bg-ui-surface-secondary dark:bg-gray-800 p-3 space-y-2">
            <div>
              <span className="text-xs text-ui-text-muted dark:text-ui-text-subtle">Endpoint:</span>
              <p className="text-sm font-mono text-ui-text dark:text-ui-text-dark truncate">
                {profile.credentials.endpoint}
              </p>
            </div>
            <div>
              <span className="text-xs text-ui-text-muted dark:text-ui-text-subtle">
                Access Key:
              </span>
              <p className="text-sm font-mono text-ui-text dark:text-ui-text-dark truncate">
                {profile.credentials.accessKeyId}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white">
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
