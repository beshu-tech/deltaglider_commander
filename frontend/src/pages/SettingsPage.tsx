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
    <div className="flex h-full flex-col overflow-auto bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-2xl p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Manage your AWS credentials and connection settings
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-slate-900">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              AWS Credentials
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Update your AWS credentials to connect to a different S3 endpoint
            </p>
          </div>

          {currentCredentials && (
            <div className="mb-6 rounded-md bg-slate-100 p-4 dark:bg-slate-800">
              <h3 className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                Current Configuration
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-600 dark:text-slate-400">S3 Endpoint:</dt>
                  <dd className="font-mono text-slate-900 dark:text-slate-100">
                    {currentCredentials.endpoint || "Default AWS"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600 dark:text-slate-400">Region:</dt>
                  <dd className="font-mono text-slate-900 dark:text-slate-100">
                    {currentCredentials.region}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600 dark:text-slate-400">Access Key:</dt>
                  <dd className="font-mono text-slate-900 dark:text-slate-100">
                    {currentCredentials.accessKeyId.slice(0, 8)}...
                  </dd>
                </div>
              </dl>
            </div>
          )}

          <div className="border-t border-slate-200 pt-6 dark:border-slate-700">
            <CredentialConfigForm onSuccess={handleCredentialUpdate} />
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={() => navigate({ to: "/buckets" })}
            disabled={isUpdating}
            className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            ← Back to Buckets
          </button>
        </div>
      </div>
    </div>
  );
}
