/**
 * Auth guard component that redirects to environments page if no credentials exist
 */

import { useEffect } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useCredentials } from "./useCredentials";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { hasCredentials } = useCredentials();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If no credentials and not already on environments page, redirect
    if (!hasCredentials && location.pathname !== "/environments") {
      navigate({ to: "/environments" });
    }
  }, [hasCredentials, location.pathname, navigate]);

  return <>{children}</>;
}
