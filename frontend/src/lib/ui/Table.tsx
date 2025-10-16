import { HTMLAttributes, TableHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export function Table({ className, ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={twMerge(
        "min-w-full divide-y divide-ui-border overflow-hidden bg-ui-surface text-sm dark:divide-ui-border-dark dark:bg-ui-surface-dark",
        className,
      )}
      {...rest}
    />
  );
}

export function TableHead({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={twMerge(
        "bg-ui-bg-subtle text-left text-xs font-semibold uppercase tracking-wide text-ui-text-muted dark:bg-ui-surface-dark dark:text-ui-text-muted-dark",
        className,
      )}
      {...rest}
    />
  );
}

export function TableBody({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={twMerge("divide-y divide-ui-border-subtle dark:divide-ui-border-subtle-dark", className)}
      {...rest}
    />
  );
}

export function TableRow({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={twMerge(
        "cursor-pointer transition hover:bg-ui-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-ui-surface-hover-dark",
        className,
      )}
      {...rest}
    />
  );
}

export function TableCell({ className, ...rest }: HTMLAttributes<HTMLTableCellElement>) {
  return <td className={twMerge("px-3 py-4 text-body-sm", className)} {...rest} />;
}
