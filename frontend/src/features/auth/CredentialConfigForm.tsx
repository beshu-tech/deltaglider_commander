/**
 * AWS Credential configuration form
 */

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useAuthStore, selectActiveCredentials, type AWSCredentials } from "../../stores/authStore";
import { SessionManager } from "../../services/sessionManager";

export interface CredentialConfigFormProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export function CredentialConfigForm({ onSuccess, onCancel }: CredentialConfigFormProps) {
  const addProfile = useAuthStore((state) => state.addProfile);
  const activeCredentials = useAuthStore(selectActiveCredentials);

  const [formData, setFormData] = useState<AWSCredentials>(() => {
    // Load saved credentials on mount
    return (
      activeCredentials || {
        accessKeyId: "",
        secretAccessKey: "",
        region: "eu-west-1",
        endpoint: "",
      }
    );
  });

  const [profileName, setProfileName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // First validate credentials by creating session
      await SessionManager.createSession(formData);

      // Only save profile after successful session creation
      addProfile(profileName || "Default Profile", formData);

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange =
    (field: keyof AWSCredentials) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData({ ...formData, [field]: e.target.value });
    };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-2xl space-y-4 rounded-lg border-2 border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
      autoComplete="on"
    >
      <div>
        <label htmlFor="profileName" className="block text-sm font-medium mb-1">
          Profile Name
          <span className="ml-1 text-xs text-ui-text-muted dark:text-ui-text-subtle">
            (optional)
          </span>
        </label>
        <input
          id="profileName"
          type="text"
          value={profileName}
          onChange={(e) => setProfileName(e.target.value)}
          className="w-full px-3 py-2 border rounded-md dark:bg-ui-surface-active-dark dark:border-ui-border-dark"
          placeholder="My S3 Profile"
        />
        <p className="mt-1 text-xs text-ui-text-muted dark:text-ui-text-subtle">
          Give this profile a memorable name to easily switch between multiple S3 accounts
        </p>
      </div>

      <div>
        <label htmlFor="accessKeyId" className="block text-sm font-medium mb-1">
          AWS Access Key ID
        </label>
        <input
          id="accessKeyId"
          name="aws-access-key-id"
          type="text"
          required
          value={formData.accessKeyId}
          onChange={handleChange("accessKeyId")}
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
          className="w-full px-3 py-2 border rounded-md dark:bg-ui-surface-active-dark dark:border-ui-border-dark"
          placeholder="AKIAIOSFODNN7EXAMPLE"
        />
      </div>

      <div>
        <label htmlFor="secretAccessKey" className="block text-sm font-medium mb-1">
          AWS Secret Access Key
        </label>
        <input
          id="secretAccessKey"
          name="aws-secret-access-key"
          type="password"
          required
          value={formData.secretAccessKey}
          onChange={handleChange("secretAccessKey")}
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          data-form-type="other"
          className="w-full px-3 py-2 border rounded-md dark:bg-ui-surface-active-dark dark:border-ui-border-dark"
          placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
        />
      </div>

      {/* Advanced Options */}
      <div className="border-t pt-4 dark:border-ui-border-dark">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-ui-text-muted hover:text-ui-text dark:text-ui-text-subtle dark:hover:text-ui-text-dark"
        >
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Advanced Options (for custom S3 endpoints)
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="endpoint" className="block text-sm font-medium mb-1">
                Custom S3 Endpoint URL
                <span className="ml-1 text-xs text-ui-text-muted dark:text-ui-text-subtle">
                  (optional, leave empty for AWS S3)
                </span>
              </label>
              <input
                id="endpoint"
                type="text"
                value={formData.endpoint}
                onChange={handleChange("endpoint")}
                className="w-full px-3 py-2 border rounded-md dark:bg-ui-surface-active-dark dark:border-ui-border-dark"
                placeholder="http://localhost:9000 or https://minio.example.com"
              />
            </div>

            <div>
              <label htmlFor="region" className="block text-sm font-medium mb-1">
                AWS Region
                <span className="ml-1 text-xs text-ui-text-muted dark:text-ui-text-subtle">
                  (optional, defaults to eu-west-1)
                </span>
              </label>
              <input
                id="region"
                type="text"
                value={formData.region}
                onChange={handleChange("region")}
                className="w-full px-3 py-2 border rounded-md dark:bg-ui-surface-active-dark dark:border-ui-border-dark"
                placeholder="eu-west-1"
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-primary-50 border border-primary-200 text-primary-700 px-4 py-3 rounded dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-400">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors dark:bg-primary-700 dark:hover:bg-primary-600"
        >
          {isSubmitting ? "Connecting..." : "Connect to object storage service"}
        </button>
      </div>
    </form>
  );
}
