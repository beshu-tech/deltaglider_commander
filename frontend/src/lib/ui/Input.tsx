import { ForwardedRef, forwardRef, InputHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const baseStyles =
  "w-full rounded-md border px-3 py-2 text-body-sm shadow-sm transition focus:outline-none focus:ring-focus focus:ring-brand-400/60 disabled:cursor-not-allowed disabled:opacity-60";

const themeStyles =
  "border-slate-300 bg-surface-elevated text-slate-900 focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

const invalidStyles = "border-rose-400 focus:border-rose-400 focus:ring-rose-300/40";

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
