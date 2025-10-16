import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouterState } from "@tanstack/react-router";

const MD_MEDIA_QUERY = "(min-width: 768px)";

interface LayoutContextValue {
  isDesktop: boolean;
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

export function LayoutProvider({ children }: PropsWithChildren) {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return window.matchMedia(MD_MEDIA_QUERY).matches;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const locationKey = useRouterState({
    select: (state) =>
      `${state.location.pathname}|${state.location.search ?? ""}|${state.location.hash ?? ""}`,
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia(MD_MEDIA_QUERY);

    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
      if (event.matches) {
        setSidebarOpen(false);
      }
    };

    if (media.matches !== isDesktop) {
      setIsDesktop(media.matches);
    }

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [isDesktop]);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((open) => !open), []);

  useEffect(() => {
    if (isDesktop) {
      return;
    }
    setSidebarOpen(false);
  }, [isDesktop, locationKey]);

  useEffect(() => {
    if (isDesktop || !sidebarOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDesktop, sidebarOpen]);

  const value = useMemo<LayoutContextValue>(
    () => ({
      isDesktop,
      sidebarOpen,
      openSidebar,
      closeSidebar,
      toggleSidebar,
      setSidebarOpen,
    }),
    [closeSidebar, isDesktop, openSidebar, sidebarOpen, toggleSidebar],
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayoutContext() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayoutContext must be used within a LayoutProvider");
  }
  return context;
}
