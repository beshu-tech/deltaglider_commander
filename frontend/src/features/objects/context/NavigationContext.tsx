import { createContext, useContext, useState, useCallback, ReactNode } from "react";

/**
 * Navigation contexts within the TUI navigation model
 */
export type NavigationContext = "buckets" | "objects" | "file-panel";

/**
 * State for the navigation context
 */
interface NavigationState {
  /** Currently active navigation context */
  activeContext: NavigationContext;
  /** Object key that was focused when FilePanel opened (for restoration) */
  lastFocusedObjectKey: string | null;
  /** Bucket name that user came from (for restoration when returning to buckets) */
  lastVisitedBucket: string | null;
}

/**
 * Methods for managing navigation context
 */
interface NavigationContextValue extends NavigationState {
  /** Set the active navigation context */
  setActiveContext: (context: NavigationContext) => void;
  /** Store the last focused object key before opening FilePanel */
  setLastFocusedObjectKey: (key: string | null) => void;
  /** Open FilePanel and store the currently focused object */
  openFilePanel: (objectKey: string) => void;
  /** Close FilePanel and restore focus to objects list */
  closeFilePanel: () => void;
  /** Check if a specific context is active */
  isContextActive: (context: NavigationContext) => boolean;
}

const NavigationContextInstance = createContext<NavigationContextValue | undefined>(undefined);

/**
 * Props for NavigationContextProvider
 */
interface NavigationContextProviderProps {
  children: ReactNode;
  /** Initial context (defaults to "objects") */
  initialContext?: NavigationContext;
}

/**
 * Provider for TUI-style modal navigation context
 *
 * Manages focus flow between:
 * - Buckets list
 * - Objects list (files/folders)
 * - FilePanel (file details and actions)
 *
 * Implements modal behavior where only one context is active at a time.
 *
 * @example
 * ```tsx
 * <NavigationContextProvider>
 *   <ObjectsView />
 * </NavigationContextProvider>
 * ```
 */
export function NavigationContextProvider({
  children,
  initialContext = "objects",
}: NavigationContextProviderProps) {
  const [state, setState] = useState<NavigationState>({
    activeContext: initialContext,
    lastFocusedObjectKey: null,
    lastVisitedBucket: null,
  });

  const setActiveContext = useCallback((context: NavigationContext) => {
    setState((prev) => ({ ...prev, activeContext: context }));
  }, []);

  const setLastFocusedObjectKey = useCallback((key: string | null) => {
    setState((prev) => ({ ...prev, lastFocusedObjectKey: key }));
  }, []);

  const openFilePanel = useCallback((objectKey: string) => {
    setState((prev) => ({
      ...prev,
      activeContext: "file-panel",
      lastFocusedObjectKey: objectKey,
    }));
  }, []);

  const closeFilePanel = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeContext: "objects",
      // Keep lastFocusedObjectKey for potential restoration
    }));
  }, []);

  const isContextActive = useCallback(
    (context: NavigationContext) => {
      return state.activeContext === context;
    },
    [state.activeContext],
  );

  const value: NavigationContextValue = {
    ...state,
    setActiveContext,
    setLastFocusedObjectKey,
    openFilePanel,
    closeFilePanel,
    isContextActive,
  };

  return (
    <NavigationContextInstance.Provider value={value}>
      {children}
    </NavigationContextInstance.Provider>
  );
}

/**
 * Hook to access navigation context
 *
 * @throws Error if used outside NavigationContextProvider
 *
 * @example
 * ```tsx
 * const { activeContext, openFilePanel, closeFilePanel } = useNavigationContext();
 *
 * // Check if objects list should handle keyboard events
 * const isListActive = activeContext === "objects";
 *
 * // Open panel when right arrow pressed on file
 * if (isFile && key === "ArrowRight") {
 *   openFilePanel(objectKey);
 * }
 * ```
 */
export function useNavigationContext(): NavigationContextValue {
  const context = useContext(NavigationContextInstance);
  if (!context) {
    throw new Error("useNavigationContext must be used within NavigationContextProvider");
  }
  return context;
}
