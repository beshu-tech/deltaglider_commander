/**
 * Global connection state management with Zustand
 * Handles connection status polling, state transitions, and activity tracking
 */

import { create } from "zustand";
import type { ConnectionStatus, ConnectionActivity } from "../types/connection";
import { api } from "../lib/api/client";

const POLL_INTERVAL = 30_000; // 30 seconds
const MAX_POLL_INTERVAL = 300_000; // 5 minutes max backoff
const MAX_ACTIVITY_HISTORY = 20;

// LocalStorage utilities
const SHEET_WIDTH_KEY = "dgcommander:connection-sheet-width";
const DEFAULT_SHEET_WIDTH = 576; // 36rem

function loadSheetWidth(): number {
  try {
    const saved = localStorage.getItem(SHEET_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_SHEET_WIDTH;
  } catch {
    return DEFAULT_SHEET_WIDTH;
  }
}

function saveSheetWidth(width: number): void {
  try {
    localStorage.setItem(SHEET_WIDTH_KEY, width.toString());
  } catch (error) {
    console.warn("Failed to save sheet width:", error);
  }
}

interface ConnectionStore {
  // State
  status: ConnectionStatus | null;
  activity: ConnectionActivity[];
  isPolling: boolean;
  pollIntervalId: NodeJS.Timeout | null;
  currentPollInterval: number;
  consecutiveErrors: number;
  sheetOpen: boolean;
  sheetWidth: number;

  // Actions
  startPolling: () => void;
  stopPolling: () => void;
  fetchStatus: () => Promise<void>;
  reconnect: () => Promise<void>;
  rotateCredentials: (
    newAccessKeyId: string,
    newSecretAccessKey: string,
    newRegion?: string,
    newEndpoint?: string,
  ) => Promise<void>;
  addActivity: (event: ConnectionActivity["event"], message: string) => void;
  setSheetOpen: (open: boolean) => void;
  setSheetWidth: (width: number) => void;
  bumpConnectionOnError: () => void;
}

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  // Initial state
  status: null,
  activity: [],
  isPolling: false,
  pollIntervalId: null,
  currentPollInterval: POLL_INTERVAL,
  consecutiveErrors: 0,
  sheetOpen: false,
  sheetWidth: loadSheetWidth(),

  // Start polling with exponential backoff on errors
  startPolling: () => {
    const state = get();
    if (state.isPolling) return;

    // Initial fetch
    get().fetchStatus();

    // Schedule next poll
    const scheduleNextPoll = () => {
      const state = get();
      if (state.pollIntervalId) {
        clearTimeout(state.pollIntervalId);
      }

      const intervalId = setTimeout(() => {
        if (document.visibilityState === "visible") {
          get().fetchStatus();
        }
        scheduleNextPoll();
      }, state.currentPollInterval);

      set({ pollIntervalId: intervalId });
    };

    scheduleNextPoll();
    set({ isPolling: true });

    // Refetch on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        get().fetchStatus();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
  },

  // Stop polling
  stopPolling: () => {
    const state = get();
    if (state.pollIntervalId) {
      clearTimeout(state.pollIntervalId);
    }
    set({ isPolling: false, pollIntervalId: null });
  },

  // Fetch current status from backend
  fetchStatus: async () => {
    try {
      const data = await api<ConnectionStatus>("/api/connection/status");
      set({
        status: data,
        consecutiveErrors: 0, // Reset on success
        currentPollInterval: POLL_INTERVAL, // Reset to normal interval
      });
    } catch (error) {
      console.error("Failed to fetch connection status:", error);

      const state = get();
      const newErrors = state.consecutiveErrors + 1;

      // Calculate exponential backoff: 30s, 60s, 2m, 4m, 5m (max)
      const newInterval = Math.min(POLL_INTERVAL * Math.pow(2, newErrors), MAX_POLL_INTERVAL);

      set({
        status: state.status
          ? { ...state.status, state: "error", errorMessage: "Failed to fetch status" }
          : null,
        consecutiveErrors: newErrors,
        currentPollInterval: newInterval,
      });

      console.log(
        `Connection error #${newErrors}, next poll in ${Math.round(newInterval / 1000)}s`,
      );
    }
  },

  // Reconnect to backend
  reconnect: async () => {
    set((state) => ({
      status: state.status ? { ...state.status, state: "reconnecting" } : null,
    }));

    try {
      await api("/api/connection/reconnect", { method: "POST" });

      get().addActivity("reconnected", "Successfully reconnected to backend");
      await get().fetchStatus();
    } catch (error) {
      console.error("Failed to reconnect:", error);
      get().addActivity("error", "Reconnection failed");
      set((state) => ({
        status: state.status
          ? { ...state.status, state: "error", errorMessage: "Reconnection failed" }
          : null,
      }));
    }
  },

  // Rotate credentials
  rotateCredentials: async (
    newAccessKeyId: string,
    newSecretAccessKey: string,
    newRegion?: string,
    newEndpoint?: string,
  ) => {
    try {
      await api("/api/connection/rotate", {
        method: "POST",
        body: JSON.stringify({
          newAccessKeyId,
          newSecretAccessKey,
          newRegion,
          newEndpoint,
        }),
      });

      get().addActivity("rotated", "Credentials rotated successfully");
      await get().fetchStatus();
    } catch (error) {
      console.error("Failed to rotate credentials:", error);
      get().addActivity("error", "Credential rotation failed");
      throw error;
    }
  },

  // Add activity to history
  addActivity: (event, message) => {
    const newActivity: ConnectionActivity = {
      timestamp: new Date().toISOString(),
      event,
      message,
    };

    set((state) => ({
      activity: [newActivity, ...state.activity].slice(0, MAX_ACTIVITY_HISTORY),
    }));
  },

  // Toggle connection sheet
  setSheetOpen: (open) => {
    set({ sheetOpen: open });
  },

  // Set sheet width and persist to localStorage
  setSheetWidth: (width) => {
    const clampedWidth = Math.max(320, Math.min(width, 768)); // 20rem to 48rem
    saveSheetWidth(clampedWidth);
    set({ sheetWidth: clampedWidth });
  },

  // Bump connection status on global fetch errors
  bumpConnectionOnError: () => {
    get().fetchStatus();
  },
}));
