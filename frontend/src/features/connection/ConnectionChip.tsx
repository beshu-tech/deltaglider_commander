/**
 * Connection status chip with 5 states and animations
 * Displays connection status and opens ConnectionPanel on click
 */

import { Cloud, AlertTriangle, WifiOff, RefreshCw, Settings } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { useConnectionStore } from "../../stores/connectionStore";
import type { ConnState } from "../../types/connection";

interface ConnectionChipProps {
  onClick?: () => void;
}

const stateConfig: Record<
  ConnState,
  {
    icon: typeof Cloud;
    label: string;
    iconClass: string;
    bgClass: string;
    textClass: string;
    pulseClass?: string;
  }
> = {
  ok: {
    icon: Cloud,
    label: "Connected",
    iconClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30",
    textClass: "text-green-900 dark:text-green-100",
  },
  warn: {
    icon: AlertTriangle,
    label: "Warning",
    iconClass: "text-yellow-600 dark:text-yellow-400",
    bgClass: "bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30",
    textClass: "text-yellow-900 dark:text-yellow-100",
  },
  error: {
    icon: AlertTriangle,
    label: "Error",
    iconClass: "text-red-600 dark:text-red-400",
    bgClass: "bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30",
    textClass: "text-red-900 dark:text-red-100",
  },
  offline: {
    icon: WifiOff,
    label: "Offline",
    iconClass: "text-gray-600 dark:text-gray-400",
    bgClass: "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700",
    textClass: "text-gray-900 dark:text-gray-100",
  },
  reconnecting: {
    icon: RefreshCw,
    label: "Reconnecting",
    iconClass: "text-blue-600 dark:text-blue-400 animate-spin",
    bgClass: "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30",
    textClass: "text-blue-900 dark:text-blue-100",
    pulseClass: "animate-pulse",
  },
};

export function ConnectionChip({ onClick }: ConnectionChipProps) {
  const status = useConnectionStore((state) => state.status);
  const setSheetOpen = useConnectionStore((state) => state.setSheetOpen);

  // Show "offline" state while status is loading
  const effectiveState = status?.state || "offline";
  const config = stateConfig[effectiveState];
  const Icon = config.icon;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setSheetOpen(true);
    }
  };

  // Build tooltip text
  const tooltipText = status
    ? `${config.label} • ${status.accessKeyId} @ ${status.endpoint} (${status.region})`
    : "Loading connection status...";

  return (
    <button
      onClick={handleClick}
      className={twMerge(
        // Base styles
        "inline-flex items-center gap-2",
        "px-3 py-1.5",
        "rounded-md",
        "text-sm font-medium",
        "transition-all duration-200",
        "border border-transparent",

        // State-specific colors
        config.bgClass,
        config.textClass,

        // Pulse animation for reconnecting state
        config.pulseClass,

        // Focus state
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900",
      )}
      title={tooltipText}
      aria-label={`Connection status: ${config.label}. Click to manage connection.`}
    >
      {/* Icon */}
      <Icon className={twMerge("w-4 h-4", config.iconClass)} aria-hidden="true" />

      {/* Label - hidden on mobile, shown on desktop */}
      <span className="hidden sm:inline">{config.label}</span>

      {/* Settings icon hint */}
      <Settings className="w-3 h-3 opacity-50" aria-hidden="true" />
    </button>
  );
}
