import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
  cacheTtlSeconds: number;
  setCacheTtlSeconds: (seconds: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      cacheTtlSeconds: 30,
      setCacheTtlSeconds: (seconds: number) => set({ cacheTtlSeconds: seconds }),
    }),
    { name: "app-settings" },
  ),
);

export function selectCacheTtlMs(state: SettingsState): number {
  return state.cacheTtlSeconds * 1000;
}
