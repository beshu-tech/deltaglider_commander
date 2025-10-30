import { Loader2 } from "lucide-react";

export interface LoadingSpinnerProps {
  /** Size variant for the spinner */
  size?: "xs" | "sm" | "md" | "lg";
  /** Accessible label describing what is loading */
  label?: string;
  /** Whether to render inline with text */
  inline?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

/**
 * Accessible loading spinner component with consistent sizing and labeling
 *
 * Features:
 * - Standardized sizes (xs, sm, md, lg)
 * - Required accessibility label for screen readers
 * - Inline mode for text integration
 * - Consistent animation across the app
 *
 * @example
 * ```tsx
 * <LoadingSpinner size="sm" label="Loading bucket stats" />
 * <LoadingSpinner size="md" label="Loading..." inline />
 * ```
 */
export function LoadingSpinner({
  size = "md",
  label = "Loading...",
  inline = false,
  className = "",
}: LoadingSpinnerProps) {
  const spinnerClasses = `${sizeClasses[size]} animate-spin ${className}`;

  if (inline) {
    return (
      <span className="inline-flex items-center gap-2">
        <Loader2 className={spinnerClasses} aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  return (
    <>
      <Loader2 className={spinnerClasses} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </>
  );
}
