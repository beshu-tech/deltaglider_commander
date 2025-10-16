import { ForwardedRef, forwardRef, SelectHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

const baseStyles =
  "rounded-md border px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-600/20 disabled:cursor-not-allowed disabled:opacity-60";

const themeStyles =
  "border-ui-border bg-ui-surface text-ui-text focus:border-primary-600 dark:border-ui-border-dark dark:bg-ui-surface-dark dark:text-ui-text-dark";

export const Select = forwardRef(function Select(
  { className, ...rest }: SelectProps,
  ref: ForwardedRef<HTMLSelectElement>,
) {
  return <select ref={ref} className={twMerge(baseStyles, themeStyles, className)} {...rest} />;
});
