import { HTMLAttributes, TableHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export function Table({ className, ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={twMerge(
        "min-w-full divide-y divide-slate-200 overflow-hidden rounded-md bg-white text-sm dark:divide-slate-700 dark:bg-slate-900",
        className
      )}
      {...rest}
    />
  );
}

export function TableHead({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={twMerge(
        "bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300",
        className
      )}
      {...rest}
    />
  );
}

export function TableBody({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={twMerge("divide-y divide-slate-100 dark:divide-slate-800", className)} {...rest} />;
}

export function TableRow({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={twMerge(
        "cursor-pointer transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-slate-800",
        className
      )}
      {...rest}
    />
  );
}

export function TableCell({ className, ...rest }: HTMLAttributes<HTMLTableCellElement>) {
  return <td className={twMerge("px-3 py-2 text-sm", className)} {...rest} />;
}
