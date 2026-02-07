/**
 * Settings page for application configuration
 */

import { useNavigate, Link } from "@tanstack/react-router";
import { Select } from "../lib/ui/Select";
import { useSettingsStore } from "../stores/settingsStore";

export function SettingsPage() {
  const navigate = useNavigate();
  const cacheTtlSeconds = useSettingsStore((s) => s.cacheTtlSeconds);
  const setCacheTtlSeconds = useSettingsStore((s) => s.setCacheTtlSeconds);

  return (
    <div className="flex h-full flex-col overflow-auto bg-ui-bg-subtle dark:bg-ui-bg-subtle-dark">
      <div className="mx-auto w-full max-w-2xl p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-ui-text dark:text-ui-text-dark">Settings</h1>
          <p className="mt-2 text-sm text-ui-text-muted dark:text-ui-text-muted-dark">
            Configure application preferences and behavior
          </p>
        </div>

        {/* Connection Management - Link to Environments */}
        <div className="rounded-lg bg-ui-surface p-6 shadow-sm dark:bg-ui-surface-dark mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ui-text dark:text-ui-text-dark">
                Connection Profiles
              </h2>
              <p className="mt-1 text-sm text-ui-text-muted dark:text-ui-text-muted-dark">
                Manage your S3 credential profiles and switch between environments
              </p>
            </div>
            <Link
              to="/environments"
              className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors dark:bg-primary-700 dark:hover:bg-primary-600"
            >
              Manage Environments →
            </Link>
          </div>
        </div>

        {/* Application Preferences */}
        <div className="rounded-lg bg-ui-surface p-6 shadow-sm dark:bg-ui-surface-dark">
          <h2 className="text-xl font-semibold text-ui-text dark:text-ui-text-dark mb-4">
            Application Preferences
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <label
                htmlFor="cache-ttl"
                className="text-sm font-medium text-ui-text dark:text-ui-text-dark"
              >
                Client-side cache TTL
              </label>
              <p className="text-xs text-ui-text-muted dark:text-ui-text-muted-dark mt-0.5">
                How long object listings stay fresh before re-fetching from the server.
                The server also caches listings for 5 seconds.
              </p>
            </div>
            <Select
              id="cache-ttl"
              value={String(cacheTtlSeconds)}
              onChange={(e) => setCacheTtlSeconds(Number(e.target.value))}
              className="w-44"
            >
              <option value="0">Disabled (always fresh)</option>
              <option value="5">5 seconds</option>
              <option value="30">30 seconds</option>
              <option value="60">1 minute</option>
              <option value="300">5 minutes</option>
              <option value="3600">1 hour</option>
              <option value="86400">24 hours</option>
            </Select>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={() => navigate({ to: "/buckets" })}
            className="text-sm text-ui-text-muted hover:text-ui-text dark:text-ui-text-muted-dark dark:hover:text-ui-text-dark"
          >
            ← Back to Buckets
          </button>
        </div>
      </div>
    </div>
  );
}
