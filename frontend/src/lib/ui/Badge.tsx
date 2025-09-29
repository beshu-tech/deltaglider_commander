import { HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export function Badge({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={twMerge(
        "inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
        className
      )}
      {...rest}
    />
  );
}
