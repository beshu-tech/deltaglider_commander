import { ForwardedRef, forwardRef, InputHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const baseStyles =
  "w-full rounded-md border px-3 py-2 text-body-sm shadow-elevation-sm transition-all duration-fast focus:outline-none focus:ring-focus focus:ring-brand-400/60 focus:shadow-elevation-md hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60 disabled:pointer-events-none dark:shadow-elevation-sm-dark dark:focus:shadow-elevation-md-dark";

const themeStyles =
  "border-slate-300 bg-surface-elevated text-slate-900 placeholder:text-slate-400 focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-600";

const invalidStyles =
  "border-rose-400 hover:border-rose-500 focus:border-rose-500 focus:ring-rose-400/60 dark:border-rose-500 dark:hover:border-rose-400";

export const Input = forwardRef(function Input(
  { className, invalid, ...rest }: InputProps,
  ref: ForwardedRef<HTMLInputElement>,
) {
  return (
    <input
      ref={ref}
      className={twMerge(baseStyles, themeStyles, invalid ? invalidStyles : "", className)}
      aria-invalid={invalid ? "true" : undefined}
      {...rest}
    />
  );
});
