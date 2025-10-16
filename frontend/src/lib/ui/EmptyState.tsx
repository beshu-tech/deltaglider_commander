import { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-ui-border p-8 text-center dark:border-ui-border-dark">
      <div className="text-lg font-semibold text-ui-text dark:text-ui-text-dark">{title}</div>
      {message ? (
        <p className="max-w-md text-sm text-ui-text-muted dark:text-ui-text-muted-dark">{message}</p>
      ) : null}
      {action}
    </div>
  );
}
