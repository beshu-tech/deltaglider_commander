/**
 * Profile button with connection status
 * Shows active profile info and navigates to environments page
 */

import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, Database } from "lucide-react";
import { useCredentialProfiles } from "../../features/auth/useCredentialProfiles";
import { useConnectionStore } from "../../stores/connectionStore";
import type { ConnState } from "../../types/connection";

const statusIconColors: Record<ConnState, string> = {
  ok: "text-green-500 dark:text-green-400",
  warn: "text-yellow-500 dark:text-yellow-400",
  error: "text-primary-500 dark:text-primary-400",
  offline: "text-gray-400 dark:text-gray-500",
  reconnecting: "text-blue-500 dark:text-blue-400 animate-pulse",
};

const statusLabels: Record<ConnState, string> = {
  ok: "Connected",
  warn: "Warning",
  error: "Error",
  offline: "Offline",
  reconnecting: "Reconnecting",
};

export function ProfileDropdown() {
  const navigate = useNavigate();
  const { activeProfile } = useCredentialProfiles();
  const connectionStatus = useConnectionStore((state) => state.status);

  const handleClick = () => {
    navigate({ to: "/environments" });
  };

  if (!activeProfile) {
    return null;
  }

  const effectiveState = connectionStatus?.state || "offline";
  const statusLabel = statusLabels[effectiveState];
  const iconColor = statusIconColors[effectiveState];
  const region = connectionStatus?.region || activeProfile.credentials.region || "unknown";

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group w-full flex items-start gap-3 px-3 py-2.5 rounded-lg border border-primary-600/30 bg-gradient-to-r from-primary-100 to-primary-50 hover:from-primary-100/80 hover:to-primary-50/80 transition-all duration-200 shadow-sm dark:border-primary-500/20 dark:from-primary-900/10 dark:to-primary-900/5 dark:hover:from-primary-900/15 dark:hover:to-primary-900/8 text-left"
    >
      {/* Content */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Connection Status Icon */}
        <div className="relative group/status flex-shrink-0">
          <Database className={`h-4 w-4 ${iconColor}`} />

          {/* Tooltip on hover */}
          <div className="absolute left-0 bottom-full mb-2 hidden group-hover/status:block z-50 pointer-events-none">
            <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium px-2 py-1 rounded shadow-lg whitespace-nowrap">
              {statusLabel}
              {connectionStatus?.errorMessage && ` • ${connectionStatus.errorMessage}`}
            </div>
          </div>
        </div>

        {/* Profile info - aligned to right of icon */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold leading-tight text-primary-900 dark:text-primary-100 truncate">
            {activeProfile.name}
          </div>
          <div className="text-[11px] leading-tight text-primary-700 dark:text-primary-300 truncate">
            {region}
          </div>
        </div>
      </div>

      {/* Chevron Icon - suggests clickable/expandable */}
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-primary-600 dark:text-primary-400 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
