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

export interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  level: ToastLevel;
  autoDismissMs?: number | null;
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
    container: "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
    icon: "text-blue-600 dark:text-blue-400",
    title: "text-blue-900 dark:text-blue-100",
    description: "text-blue-700 dark:text-blue-300",
    IconComponent: Info,
  },
  success: {
    container: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800",
    icon: "text-emerald-600 dark:text-emerald-400",
    title: "text-emerald-900 dark:text-emerald-100",
    description: "text-emerald-700 dark:text-emerald-300",
    IconComponent: Check,
  },
  error: {
    container: "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800",
    icon: "text-red-600 dark:text-red-400",
    title: "text-red-900 dark:text-red-100",
    description: "text-red-700 dark:text-red-300",
    IconComponent: AlertCircle,
  },
};

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
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {toasts.map((toast) => {
          const styles = levelStyles[toast.level];
          const Icon = styles.IconComponent;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex min-w-[280px] max-w-[400px] items-start gap-3 rounded-lg border p-3 shadow-lg transition-all hover:shadow-xl ${styles.container}`}
            >
              <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${styles.icon}`} />
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold ${styles.title}`}>{toast.title}</div>
                {toast.description && (
                  <p
                    className={`mt-0.5 text-xs ${styles.description} truncate`}
                    title={toast.description}
                  >
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(toast.id)}
                className={`flex-shrink-0 rounded p-1 transition hover:bg-white/50 dark:hover:bg-black/20 ${styles.icon}`}
                aria-label="Dismiss"
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
