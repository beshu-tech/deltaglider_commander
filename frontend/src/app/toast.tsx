import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, Info, X, AlertCircle } from "lucide-react";

export type ToastLevel = "info" | "success" | "error";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  level: ToastLevel;
  autoDismissMs?: number | null;
  action?: ToastAction;
}

interface ToastContextValue {
  push: (toast: Omit<ToastMessage, "id">) => number;
  update: (id: number, toast: Partial<Omit<ToastMessage, "id">>) => void;
  remove: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);
let nextToastId = 1;

// Singleton toast instance for use outside React components
let globalToastPush: ((toast: Omit<ToastMessage, "id">) => number) | null = null;
let globalToastUpdate: ToastContextValue["update"] | null = null;
let globalToastRemove: ToastContextValue["remove"] | null = null;

export const toast = {
  push: (message: Omit<ToastMessage, "id">): number => {
    if (globalToastPush) {
      return globalToastPush(message);
    }
    console.warn("Toast not initialized yet, message:", message);
    return -1;
  },
  update: (id: number, message: Partial<Omit<ToastMessage, "id">>) => {
    if (globalToastUpdate) {
      globalToastUpdate(id, message);
    } else {
      console.warn("Toast not initialized yet, update:", id, message);
    }
  },
  remove: (id: number) => {
    if (globalToastRemove) {
      globalToastRemove(id);
    } else {
      console.warn("Toast not initialized yet, remove:", id);
    }
  },
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

const levelStyles = {
  info: {
    container:
      "bg-gradient-to-br from-emerald-900/95 via-emerald-900 to-emerald-900/90 border border-emerald-800/60 dark:border-emerald-700/60",
    icon: "text-white",
    title: "text-white",
    description: "text-emerald-100",
    IconComponent: Info,
  },
  success: {
    container:
      "bg-gradient-to-br from-green-900/95 via-green-900 to-green-900/90 border border-green-800/60 dark:border-green-700/60",
    icon: "text-white",
    title: "text-white",
    description: "text-green-100",
    IconComponent: Check,
  },
  error: {
    container:
      "bg-gradient-to-br from-primary-900/95 via-primary-900 to-primary-900/90 border border-primary-800/60 dark:border-primary-700/60",
    icon: "text-white",
    title: "text-white",
    description: "text-primary-100",
    IconComponent: AlertCircle,
  },
} as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timersRef = useRef<Map<number, number>>(new Map());

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timers = timersRef.current;
    const existing = timers.get(id);
    if (existing !== undefined) {
      window.clearTimeout(existing);
      timers.delete(id);
    }
  }, []);

  const scheduleTimeout = useCallback(
    (toastMessage: ToastMessage) => {
      const timers = timersRef.current;
      const currentTimeout = timers.get(toastMessage.id);
      if (currentTimeout !== undefined) {
        window.clearTimeout(currentTimeout);
        timers.delete(toastMessage.id);
      }

      const defaultTimeout =
        toastMessage.level === "success" ? 3000 : toastMessage.level === "error" ? 7000 : 5000;
      const timeout =
        toastMessage.autoDismissMs === undefined ? defaultTimeout : toastMessage.autoDismissMs;

      if (timeout === null) {
        return;
      }

      const handle = window.setTimeout(() => remove(toastMessage.id), timeout);
      timers.set(toastMessage.id, handle);
    },
    [remove],
  );

  const push = useCallback(
    (toast: Omit<ToastMessage, "id">) => {
      const id = nextToastId++;
      const toastWithId: ToastMessage = { ...toast, id };
      setToasts((current) => [...current, toastWithId]);
      scheduleTimeout(toastWithId);
      return id;
    },
    [scheduleTimeout],
  );

  const update = useCallback(
    (id: number, updates: Partial<Omit<ToastMessage, "id">>) => {
      let nextToast: ToastMessage | null = null;
      setToasts((current) =>
        current.map((existing) => {
          if (existing.id !== id) {
            return existing;
          }
          nextToast = { ...existing, ...updates, id };
          return nextToast;
        }),
      );
      if (nextToast) {
        scheduleTimeout(nextToast);
      }
    },
    [scheduleTimeout],
  );

  // Initialize global toast instance
  useEffect(() => {
    globalToastPush = push;
    globalToastUpdate = update;
    globalToastRemove = remove;
    return () => {
      globalToastPush = null;
      globalToastUpdate = null;
      globalToastRemove = null;
    };
  }, [push, update, remove]);

  // Initialize global toast instance
  const value = useMemo(() => ({ push, update, remove }), [push, update, remove]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => {
          const styles = levelStyles[toast.level];
          const Icon = styles.IconComponent;
          return (
            <div
              key={toast.id}
              role={toast.level === "error" ? "alert" : "status"}
              className={`pointer-events-auto flex min-w-[360px] max-w-[520px] items-start gap-4 rounded-xl border p-4 text-base shadow-2xl transition-all duration-base hover:shadow-2xl ${styles.container} animate-in slide-in-from-right-5 fade-in`}
            >
              <Icon className={`mt-0.5 h-6 w-6 flex-shrink-0 ${styles.icon}`} aria-hidden="true" />
              <div className="flex-1 min-w-0 space-y-1 text-white">
                <div className={`text-base font-semibold leading-6 ${styles.title}`}>
                  {toast.title}
                </div>
                {toast.description && (
                  <p
                    className={`text-sm leading-5 ${styles.description}`}
                    title={toast.description}
                  >
                    {toast.description}
                  </p>
                )}
                {toast.action && (
                  <button
                    type="button"
                    onClick={() => {
                      toast.action?.onClick();
                      remove(toast.id);
                    }}
                    className="mt-2 inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-white/20 hover:bg-white/30 rounded-md transition-colors duration-fast focus:outline-none focus:ring-2 focus:ring-white/50"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(toast.id)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    remove(toast.id);
                  }
                }}
                className={`x-close-button flex-shrink-0 rounded-md p-1.5 transition-colors duration-fast hover:bg-white/10 ${styles.icon}`}
                aria-label={`Dismiss ${toast.level} notification: ${toast.title}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
