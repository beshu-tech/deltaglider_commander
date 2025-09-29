import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";

export type ToastLevel = "info" | "success" | "error";

export interface ToastMessage {
  id: number;
  title: string;
  description?: string;
  level: ToastLevel;
}

interface ToastContextValue {
  push: (toast: Omit<ToastMessage, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);
let nextToastId = 1;

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<ToastMessage, "id">) => {
      const id = nextToastId++;
      setToasts((current) => [...current, { ...toast, id }]);
      window.setTimeout(() => remove(id), 5000);
    },
    [remove]
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-3">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            onClick={() => remove(toast.id)}
            className="pointer-events-auto w-fit min-w-[280px] max-w-[360px] rounded-lg border border-slate-200 bg-white p-4 text-left shadow transition hover:shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{toast.title}</div>
            {toast.description ? (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{toast.description}</p>
            ) : null}
            <span className="mt-2 inline-block text-xs text-slate-400">Click to dismiss</span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
