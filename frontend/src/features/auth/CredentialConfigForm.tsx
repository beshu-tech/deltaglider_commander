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
        region: "us-east-1",
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
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto p-6">
      <div>
        <label htmlFor="accessKeyId" className="block text-sm font-medium mb-1">
          AWS Access Key ID
        </label>
        <input
          id="accessKeyId"
          type="text"
          required
          value={formData.accessKeyId}
          onChange={handleChange("accessKeyId")}
          className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
          placeholder="AKIAIOSFODNN7EXAMPLE"
        />
      </div>

      <div>
        <label htmlFor="secretAccessKey" className="block text-sm font-medium mb-1">
          AWS Secret Access Key
        </label>
        <input
          id="secretAccessKey"
          type="password"
          required
          value={formData.secretAccessKey}
          onChange={handleChange("secretAccessKey")}
          className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
          placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
        />
      </div>

      {/* Advanced Options */}
      <div className="border-t pt-4 dark:border-slate-700">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Advanced Options (for custom S3 endpoints)
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="endpoint" className="block text-sm font-medium mb-1">
                Custom S3 Endpoint URL
                <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
                  (optional, leave empty for AWS S3)
                </span>
              </label>
              <input
                id="endpoint"
                type="text"
                value={formData.endpoint}
                onChange={handleChange("endpoint")}
                className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                placeholder="http://localhost:9000 or https://minio.example.com"
              />
            </div>

            <div>
              <label htmlFor="region" className="block text-sm font-medium mb-1">
                AWS Region
                <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">
                  (optional, defaults to us-east-1)
                </span>
              </label>
              <input
                id="region"
                type="text"
                value={formData.region}
                onChange={handleChange("region")}
                className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                placeholder="us-east-1"
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
