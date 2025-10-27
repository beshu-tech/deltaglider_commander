/**
 * Feature flag hook for controlling experimental features
 */

import { getEnv } from "../config/env";

export function useFeatureFlag(flag: "connectionChip"): boolean {
  const env = getEnv();

  switch (flag) {
    case "connectionChip":
      return env.VITE_FEATURE_CONNECTION_CHIP;
    default:
      return false;
  }
}
