import { HTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export function Badge({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={twMerge(
        "inline-flex items-center rounded-full border border-ui-border bg-ui-surface-active px-2 py-0.5 text-label-sm text-ui-text dark:border-ui-border-hover-dark dark:bg-ui-surface-dark dark:text-ui-text-dark",
        className,
      )}
      {...rest}
    />
  );
}
