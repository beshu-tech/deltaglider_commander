/**
 * Connection status chip - displays connection state from authStore
 */

import { Cloud, AlertTriangle, WifiOff, RefreshCw, Settings } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { useAuthStore, selectConnectionState } from "../../stores/authStore";
import type { ConnectionStatus } from "../../types/connection";

interface ConnectionChipProps {
  onClick?: () => void;
}

type ConnState = ConnectionStatus["state"];

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
  idle: {
    icon: WifiOff,
    label: "Idle",
    iconClass: "text-gray-600 dark:text-gray-400",
    bgClass: "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700",
    textClass: "text-gray-900 dark:text-gray-100",
  },
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
    iconClass: "text-primary-600 dark:text-primary-400",
    bgClass:
      "bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30",
    textClass: "text-primary-900 dark:text-primary-100",
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
  const connectionState = useAuthStore(selectConnectionState);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);

  const config = stateConfig[connectionState];
  const Icon = config.icon;

  const errorMsg = connectionStatus?.errorMessage || "";
  const tooltipText = connectionStatus
    ? `${config.label}${errorMsg ? ` • ${errorMsg}` : ""}`
    : "No active credentials";

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
      aria-label={`Connection status: ${config.label}`}
    >
      <Icon className={twMerge("w-4 h-4", config.iconClass)} aria-hidden="true" />
      <span className="hidden sm:inline">{config.label}</span>
      <Settings className="w-3 h-3 opacity-50" aria-hidden="true" />
    </button>
  );
}
