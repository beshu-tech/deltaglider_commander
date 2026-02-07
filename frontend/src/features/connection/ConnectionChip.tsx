/**
 * Environment status chip - displays connection state from authStore
 */

import { Settings } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { useAuthStore, selectConnectionState } from "../../stores/authStore";
import { CONNECTION_CHIP_CONFIG } from "./connectionStateStyles";

interface ConnectionChipProps {
  onClick?: () => void;
}

export function ConnectionChip({ onClick }: ConnectionChipProps) {
  const connectionState = useAuthStore(selectConnectionState);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);

  const config = CONNECTION_CHIP_CONFIG[connectionState];
  const Icon = config.icon;

  const errorMsg = connectionStatus?.errorMessage || "";
  const tooltipText = connectionStatus
    ? `${config.label}${errorMsg ? ` • ${errorMsg}` : ""}`
    : "No active environment";

  return (
    <button
      onClick={onClick}
      className={twMerge(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium",
        "transition-all duration-200 border border-transparent",
        config.bgClass,
        config.textClass,
        config.pulseClass,
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
      )}
      title={tooltipText}
      aria-label={`Environment status: ${config.label}`}
    >
      <Icon className={twMerge("w-4 h-4", config.iconClass)} aria-hidden="true" />
      <span className="hidden sm:inline">{config.label}</span>
      <Settings className="w-3 h-3 opacity-50" aria-hidden="true" />
    </button>
  );
}
