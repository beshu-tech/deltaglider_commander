import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchBuckets } from "../../lib/api/endpoints";
import { qk } from "../../lib/api/queryKeys";
import { getPollMs } from "../../lib/config/env";
import { Bucket } from "./types";
import { useConnectionStore } from "../../stores/connectionStore";
import { CredentialManager } from "../../services/credentials";
import { PROFILES_EVENTS } from "../../services/credentialProfiles";

interface UseBucketsOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
}

// Subscribe to profile changes
function subscribeToProfiles(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(PROFILES_EVENTS.ACTIVE_PROFILE_CHANGED, callback);
  return () => {
    window.removeEventListener(PROFILES_EVENTS.ACTIVE_PROFILE_CHANGED, callback);
  };
}

function getHasActiveProfile() {
  return CredentialManager.getActive() !== null;
}

export function useBuckets(options?: UseBucketsOptions) {
  const connectionStatus = useConnectionStore((state) => state.status);

  // Subscribe to profile changes reactively
  const hasActiveProfile = useSyncExternalStore(
    subscribeToProfiles,
    getHasActiveProfile,
    () => false, // Server-side: no profiles
  );

  // Only allow queries when:
  // 1. There's an active credential profile
  // 2. Options don't explicitly disable (enabled: false)
  const shouldEnableQuery = hasActiveProfile && (options?.enabled ?? true);

  // Only enable automatic refetching when connection is healthy
  const shouldAutoRefetch = connectionStatus?.state !== "error";

  return useQuery<Bucket[]>({
    queryKey: qk.buckets,
    queryFn: fetchBuckets,
    staleTime: 30_000,
    refetchInterval:
      options && "refetchInterval" in options && options.refetchInterval !== undefined
        ? options.refetchInterval
        : shouldAutoRefetch
          ? getPollMs()
          : false,
    enabled: shouldEnableQuery,
  });
}
