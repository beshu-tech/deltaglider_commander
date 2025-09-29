import { ForwardedRef, forwardRef, SelectHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

const baseStyles =
  "rounded-md border px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-brand-400/60 disabled:cursor-not-allowed disabled:opacity-60";

const themeStyles =
  "border-slate-300 bg-white text-slate-700 focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

export const Select = forwardRef(function Select(
  { className, ...rest }: SelectProps,
  ref: ForwardedRef<HTMLSelectElement>
) {
  return <select ref={ref} className={twMerge(baseStyles, themeStyles, className)} {...rest} />;
});

