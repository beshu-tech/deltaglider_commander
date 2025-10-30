import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "../../lib/api/queryKeys";
import { getErrorMessage } from "../../lib/api/client";
import { useAuthStore, selectActiveCredentials } from "../../stores/authStore";
import { useSessionStatus } from "./useSessionStatus";

export type ConnectionStatus = "connected" | "checking" | "error" | "disconnected";

export interface ConnectionDetails {
  accessKeyId: string;
  endpoint: string;
  region: string;
}

export interface ConnectionSummaryOptions {
  issue?: {
    isError: boolean;
    error?: unknown;
  };
}

interface SessionIssue {
  status: ConnectionStatus;
  message?: string;
}

function readConnectionDetails(): ConnectionDetails | null {
  const credentials = selectActiveCredentials(useAuthStore.getState());
  if (!credentials || !credentials.accessKeyId) {
    return null;
  }

  return {
    accessKeyId: credentials.accessKeyId,
    endpoint: credentials.endpoint,
    region: credentials.region,
  };
}

function resolveSessionIssue(
  isLoading: boolean,
  isError: boolean,
  sessionValid: boolean | undefined,
  error: unknown,
): SessionIssue | null {
  if (isLoading) {
    return { status: "checking", message: "Verifying stored credentials…" };
  }

  if (isError) {
    return { status: "error", message: getErrorMessage(error) };
  }

  if (sessionValid === false) {
    return { status: "error", message: "Session expired. Reconnect from settings." };
  }

  return null;
}

export function useConnectionSummary(options?: ConnectionSummaryOptions) {
  const queryClient = useQueryClient();
  const [connection, setConnection] = useState<ConnectionDetails | null>(() =>
    readConnectionDetails(),
  );
  const previousIssueWasError = useRef<boolean>(false);
  const [updatedAt, setUpdatedAt] = useState<number>(() => Date.now());

  const sessionStatusEnabled = typeof window !== "undefined" && !!connection;
  const {
    data: sessionStatus,
    isLoading: isSessionLoading,
    isError: isSessionError,
    error: sessionError,
  } = useSessionStatus({ enabled: sessionStatusEnabled });

  // Subscribe to authStore changes
  useEffect(() => {
    const updateConnection = () => {
      setConnection(readConnectionDetails());
      queryClient.invalidateQueries({ queryKey: qk.sessionStatus });
    };

    // Subscribe to authStore for reactive updates
    const unsubscribe = useAuthStore.subscribe(updateConnection);

    // Initialize connection
    updateConnection();

    return unsubscribe;
  }, [queryClient]);

  const issueIsError = !!options?.issue?.isError;
  useEffect(() => {
    if (previousIssueWasError.current && !issueIsError && connection) {
      queryClient.invalidateQueries({ queryKey: qk.sessionStatus });
    }
    previousIssueWasError.current = issueIsError;
  }, [issueIsError, connection, queryClient]);

  const sessionIssue = useMemo(
    () => resolveSessionIssue(isSessionLoading, isSessionError, sessionStatus?.valid, sessionError),
    [isSessionLoading, isSessionError, sessionStatus?.valid, sessionError],
  );

  useEffect(() => {
    if (!connection) {
      return;
    }
    if (sessionIssue?.status === "error") {
      const retryTimer = window.setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: qk.sessionStatus });
      }, 10_000);
      return () => window.clearTimeout(retryTimer);
    }
    return undefined;
  }, [connection, sessionIssue?.status, queryClient]);

  const summary = useMemo(() => {
    let status: ConnectionStatus = connection ? "connected" : "disconnected";
    let message: string | undefined;

    if (!connection) {
      status = "disconnected";
      message = "Not connected";
    }

    if (sessionIssue) {
      status = sessionIssue.status;
      message = sessionIssue.message;
    }

    if (options?.issue?.isError) {
      status = "error";
      message = getErrorMessage(options.issue.error);
    }

    const defaultMessages: Record<ConnectionStatus, string> = {
      connected: "Session healthy and ready to use.",
      checking: "Verifying stored credentials…",
      error: "Action required: review your S3 configuration.",
      disconnected: "Connect your S3 credentials to start using Commander.",
    };

    if (!message) {
      message = defaultMessages[status];
    }

    return {
      connection,
      status,
      message,
    };
  }, [connection, options?.issue?.error, options?.issue?.isError, sessionIssue]);

  useEffect(() => {
    setUpdatedAt(Date.now());
  }, [summary.connection, summary.status, summary.message]);

  return {
    ...summary,
    updatedAt,
  };
}
