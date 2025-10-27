import { forwardRef, type ButtonHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

type Variant = "primary" | "secondary" | "ghost" | "outline";

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-all duration-fast focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-primary-900 focus-visible:ring-focus focus-visible:ring-primary-900/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:pointer-events-none";

const variantClasses: Record<Variant, string> = {
  primary:
    "border-transparent bg-gradient-to-r from-primary-900/90 via-primary-900 to-primary-900/90 text-white hover:from-primary-800/80 hover:via-primary-800 hover:to-primary-800/80 active:from-primary-950 active:via-primary-950 active:to-primary-950 shadow-elevation-sm hover:shadow-elevation-md dark:shadow-elevation-sm-dark dark:hover:shadow-elevation-md-dark",
  secondary:
    "border-ui-border bg-ui-surface text-ui-text hover:bg-ui-surface-hover active:bg-ui-surface-active shadow-elevation-sm hover:shadow-elevation-md dark:border-ui-border-dark dark:bg-ui-surface-dark dark:text-ui-text-dark dark:hover:bg-ui-surface-hover-dark dark:shadow-elevation-sm-dark dark:hover:shadow-elevation-md-dark",
  ghost:
    "border-transparent bg-transparent text-ui-text hover:bg-ui-surface-hover active:bg-ui-surface-active dark:text-ui-text-dark dark:hover:bg-ui-surface-hover-dark dark:active:bg-ui-surface-active-dark",
  outline:
    "border-ui-border bg-transparent text-ui-text hover:bg-ui-surface-hover/70 active:bg-ui-surface-active dark:border-ui-border-hover-dark dark:text-ui-text-dark dark:hover:bg-ui-surface-hover-dark/70 dark:active:bg-ui-surface-hover-dark",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={twMerge(baseClasses, variantClasses[variant], className)}
      {...rest}
    />
  );
});
