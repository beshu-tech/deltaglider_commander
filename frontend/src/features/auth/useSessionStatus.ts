import { useQuery } from "@tanstack/react-query";
import { qk } from "../../lib/api/queryKeys";
import { SessionManager, type SessionStatusResponse } from "../../services/sessionManager";

interface UseSessionStatusOptions {
  enabled?: boolean;
}

export function useSessionStatus(options?: UseSessionStatusOptions) {
  return useQuery<SessionStatusResponse>({
    queryKey: qk.sessionStatus,
    queryFn: () => SessionManager.checkStatus(),
    enabled: options?.enabled ?? true,
    staleTime: 10_000,
    retry: (failureCount) => failureCount < 3,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}
