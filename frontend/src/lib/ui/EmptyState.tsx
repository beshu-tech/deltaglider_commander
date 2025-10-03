import { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
      <div className="text-lg font-semibold text-slate-700 dark:text-slate-200">{title}</div>
      {message ? (
        <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">{message}</p>
      ) : null}
      {action}
    </div>
  );
}
