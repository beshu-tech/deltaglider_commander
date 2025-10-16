import { ForwardedRef, forwardRef, InputHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

const baseStyles =
  "w-full rounded-md border px-3 py-2 text-body-sm shadow-elevation-sm transition-all duration-fast focus:outline-none focus:ring-focus focus:ring-primary-600/20 focus:shadow-elevation-md hover:border-ui-border-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:pointer-events-none dark:shadow-elevation-sm-dark dark:focus:shadow-elevation-md-dark dark:hover:border-ui-border-hover-dark";

const themeStyles =
  "border-ui-border bg-ui-surface text-ui-text placeholder:text-ui-text-subtle focus:border-primary-600 dark:border-ui-border-dark dark:bg-ui-surface-dark dark:text-ui-text-dark dark:placeholder:text-ui-text-subtle-dark";

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
