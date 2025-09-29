import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { RouterProvider } from "@tanstack/react-router";
import { getPollMs } from "../lib/config/env";
import { ToastProvider } from "./toast";
import { router } from "./routes";
import { ErrorBoundary } from "./ErrorBoundary";

export function AppProviders() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            refetchOnWindowFocus: false,
            gcTime: getPollMs() * 3
          }
        }
      })
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
