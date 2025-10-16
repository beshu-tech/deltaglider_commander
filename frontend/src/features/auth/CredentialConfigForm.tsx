/**
 * AWS Credential configuration form
 */

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { AWSCredentials, CredentialStorage } from "../../services/credentialStorage";
import { SessionManager } from "../../services/sessionManager";

export interface CredentialConfigFormProps {
  onSuccess: () => void;
}

export function CredentialConfigForm({ onSuccess }: CredentialConfigFormProps) {
  const [formData, setFormData] = useState<AWSCredentials>(() => {
    // Load saved credentials on mount
    const saved = CredentialStorage.load();
    return (
      saved || {
        accessKeyId: "",
        secretAccessKey: "",
        region: "eu-west-1",
        endpoint: "",
      }
    );
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Save to localStorage on every change
  useEffect(() => {
    CredentialStorage.save(formData);
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await SessionManager.createSession(formData);
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
      className="mx-auto w-full max-w-md space-y-4 rounded-xl bg-white/70 p-4 shadow-sm dark:bg-ui-surface-dark/60 sm:p-6"
      autoComplete="on"
    >
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed dark:bg-blue-700 dark:hover:bg-blue-600"
      >
        {isSubmitting ? "Connecting..." : "Connect to S3"}
      </button>
    </form>
  );
}
