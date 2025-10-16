/**
 * Settings page for credential management
 */

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CredentialConfigForm } from "../features/auth/CredentialConfigForm";
import { CredentialStorage } from "../services/credentialStorage";

export function SettingsPage() {
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  const currentCredentials = CredentialStorage.load();

  const handleCredentialUpdate = async () => {
    setIsUpdating(true);
    try {
      // Session was already created by the form, just navigate to buckets
      navigate({ to: "/buckets" });
    } catch (error) {
      console.error("Failed to navigate:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-auto bg-ui-bg-subtle dark:bg-ui-bg-subtle-dark">
      <div className="mx-auto w-full max-w-2xl p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-ui-text dark:text-ui-text-dark">Settings</h1>
          <p className="mt-2 text-sm text-ui-text-muted dark:text-ui-text-muted-dark">
            Manage your AWS credentials and connection settings
          </p>
        </div>

        <div className="rounded-lg bg-ui-surface p-6 shadow-sm dark:bg-ui-surface-dark">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-ui-text dark:text-ui-text-dark">
              AWS Credentials
            </h2>
            <p className="mt-1 text-sm text-ui-text-muted dark:text-ui-text-muted-dark">
              Update your AWS credentials to connect to a different S3 endpoint
            </p>
          </div>

          {currentCredentials && (
            <div className="mb-6 rounded-md bg-ui-surface-active p-4 dark:bg-ui-surface-hover-dark">
              <h3 className="mb-3 text-sm font-medium text-ui-text dark:text-ui-text-dark">
                Current Configuration
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ui-text-muted dark:text-ui-text-muted-dark">S3 Endpoint:</dt>
                  <dd className="font-mono text-ui-text dark:text-ui-text-dark">
                    {currentCredentials.endpoint || "Default AWS"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ui-text-muted dark:text-ui-text-muted-dark">Region:</dt>
                  <dd className="font-mono text-ui-text dark:text-ui-text-dark">
                    {currentCredentials.region}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ui-text-muted dark:text-ui-text-muted-dark">Access Key:</dt>
                  <dd className="font-mono text-ui-text dark:text-ui-text-dark">
                    {currentCredentials.accessKeyId.slice(0, 8)}...
                  </dd>
                </div>
              </dl>
            </div>
          )}

          <div className="border-t border-ui-border pt-6 dark:border-ui-border-dark">
            <CredentialConfigForm onSuccess={handleCredentialUpdate} />
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={() => navigate({ to: "/buckets" })}
            disabled={isUpdating}
            className="text-sm text-ui-text-muted hover:text-ui-text dark:text-ui-text-muted-dark dark:hover:text-ui-text-dark"
          >
            ← Back to Buckets
          </button>
        </div>
      </div>
    </div>
  );
}
