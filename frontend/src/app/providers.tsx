import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { RouterProvider } from "@tanstack/react-router";
import { getPollMs } from "../lib/config/env";
import { ToastProvider, toast } from "./toast";
import { router } from "./routes";
import { ErrorBoundary } from "./ErrorBoundary";
import { useAuthStore } from "../stores/authStore";
import { ApiError } from "../lib/api/client";

export function AppProviders() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Don't retry on client errors (4xx) - these are configuration issues
            retry: (failureCount, error) => {
              if (
                error instanceof ApiError &&
                error.status !== undefined &&
                error.status >= 400 &&
                error.status < 500
              ) {
                return false;
              }
              // Retry server errors (5xx) and network errors up to 2 times
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
            gcTime: getPollMs() * 3,
          },
          mutations: {
            // Global error handler for auth failures
            onError: (error: unknown) => {
              if (error instanceof ApiError) {
                const authStore = useAuthStore.getState();

                // Update connection status to error
                authStore.setConnectionStatus({
                  state: "error",
                  errorMessage: error.message,
                });

                // Handle authentication failures
                if (error.status === 401 || error.status === 403) {
                  authStore.clearActiveProfile();
                  toast.push({
                    title: "Authentication Failed",
                    description: "Your credentials are invalid. Please sign in again.",
                    level: "error",
                    action: {
                      label: "Sign In",
                      onClick: () => {
                        window.location.href = "/settings";
                      },
                    },
                  });
                }
              }
            },

            // Global success handler to update connection status
            onSuccess: () => {
              const authStore = useAuthStore.getState();
              // Any successful query means we're connected
              authStore.setConnectionStatus({
                state: "ok",
              });
            },
          },
        },
      }),
  );
  const [appRouter] = useState(() => router);

  useEffect(() => {
    appRouter.update({ context: { queryClient } });
  }, [appRouter, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ErrorBoundary>
          <RouterProvider router={appRouter} />
        </ErrorBoundary>
      </ToastProvider>
    </QueryClientProvider>
  );
}
