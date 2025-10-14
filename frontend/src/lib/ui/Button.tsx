import { forwardRef, type ButtonHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

type Variant = "primary" | "secondary" | "ghost";

const baseClasses =
  "inline-flex items-center justify-center gap-inline rounded-md border px-3 py-2 text-body-sm font-medium transition-all duration-fast focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-red-900 focus-visible:ring-focus focus-visible:ring-red-900/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:pointer-events-none";

const variantClasses: Record<Variant, string> = {
  primary:
    "border-transparent bg-gradient-to-r from-red-900/90 via-red-900 to-red-900/90 text-white hover:from-red-800/80 hover:via-red-800 hover:to-red-800/80 active:from-red-950 active:via-red-950 active:to-red-950 shadow-elevation-sm hover:shadow-elevation-md dark:shadow-elevation-sm-dark dark:hover:shadow-elevation-md-dark",
  secondary:
    "border-slate-300 bg-white text-slate-900 hover:bg-slate-50 active:bg-slate-100 shadow-elevation-sm hover:shadow-elevation-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 dark:shadow-elevation-sm-dark dark:hover:shadow-elevation-md-dark",
  ghost:
    "border-transparent bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800 dark:active:bg-slate-700",
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
