import { AlertTriangle, Cloud, RefreshCw, WifiOff } from "lucide-react";

import type { ConnState } from "../../types/connection";

export const CONNECTION_STATE_LABELS: Record<ConnState, string> = {
  idle: "Idle",
  ok: "Connected",
  warn: "Warning",
  error: "Error",
  offline: "Offline",
  reconnecting: "Reconnecting",
};

export const CONNECTION_STATE_ICON_CLASSES: Record<ConnState, string> = {
  idle: "text-gray-400 dark:text-gray-500",
  ok: "text-green-500 dark:text-green-400",
  warn: "text-yellow-500 dark:text-yellow-400",
  error: "text-primary-500 dark:text-primary-400",
  offline: "text-gray-400 dark:text-gray-500",
  reconnecting: "text-blue-500 dark:text-blue-400 animate-pulse",
};

export const CONNECTION_STATE_BADGE_CLASSES: Record<ConnState, string> = {
  idle: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300",
  ok: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
  warn: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
  error: "bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-300",
  offline: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300",
  reconnecting: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
};

export interface ConnectionChipConfig {
  icon: typeof Cloud;
  label: string;
  iconClass: string;
  bgClass: string;
  textClass: string;
  pulseClass?: string;
}

export const CONNECTION_CHIP_CONFIG: Record<ConnState, ConnectionChipConfig> = {
  idle: {
    icon: WifiOff,
    label: CONNECTION_STATE_LABELS.idle,
    iconClass: "text-gray-600 dark:text-gray-400",
    bgClass: "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700",
    textClass: "text-gray-900 dark:text-gray-100",
  },
  ok: {
    icon: Cloud,
    label: CONNECTION_STATE_LABELS.ok,
    iconClass: "text-green-600 dark:text-green-400",
    bgClass: "bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30",
    textClass: "text-green-900 dark:text-green-100",
  },
  warn: {
    icon: AlertTriangle,
    label: CONNECTION_STATE_LABELS.warn,
    iconClass: "text-yellow-600 dark:text-yellow-400",
    bgClass: "bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30",
    textClass: "text-yellow-900 dark:text-yellow-100",
  },
  error: {
    icon: AlertTriangle,
    label: CONNECTION_STATE_LABELS.error,
    iconClass: "text-primary-600 dark:text-primary-400",
    bgClass:
      "bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30",
    textClass: "text-primary-900 dark:text-primary-100",
  },
  offline: {
    icon: WifiOff,
    label: CONNECTION_STATE_LABELS.offline,
    iconClass: "text-gray-600 dark:text-gray-400",
    bgClass: "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700",
    textClass: "text-gray-900 dark:text-gray-100",
  },
  reconnecting: {
    icon: RefreshCw,
    label: CONNECTION_STATE_LABELS.reconnecting,
    iconClass: "text-blue-600 dark:text-blue-400 animate-spin",
    bgClass: "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30",
    textClass: "text-blue-900 dark:text-blue-100",
    pulseClass: "animate-pulse",
  },
};
