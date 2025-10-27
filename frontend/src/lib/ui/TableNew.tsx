/**
 * Simplified table primitive with no gridlines
 * Uses hover and selected states for visual feedback
 * Following the new design system specifications
 */

import { type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface TableProps {
  children: ReactNode;
  className?: string;
}

interface TableRowProps {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  "aria-selected"?: boolean;
}

interface TableCellProps {
  children: ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
  header?: boolean;
}

export function TableNew({ children, className }: TableProps) {
  return (
    <div className={twMerge("w-full overflow-auto", className)}>
      <table className="w-full border-collapse">{children}</table>
    </div>
  );
}

export function TableHeaderNew({ children, className }: TableProps) {
  return (
    <thead className={twMerge("border-b border-gray-200 dark:border-gray-800", className)}>
      {children}
    </thead>
  );
}

export function TableBodyNew({ children, className }: TableProps) {
  return <tbody className={className}>{children}</tbody>;
}

export function TableRowNew({
  children,
  selected = false,
  onClick,
  className,
  "aria-selected": ariaSelected,
}: TableRowProps) {
  const isInteractive = !!onClick;

  return (
    <tr
      onClick={onClick}
      aria-selected={ariaSelected ?? selected}
      className={twMerge(
        // Base styles
        "transition-colors",

        // Hover state (only for interactive rows)
        isInteractive && "hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer",

        // Selected state
        selected && "bg-blue-50 dark:bg-blue-900/20",

        // Focus state
        isInteractive && "focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800",

        className,
      )}
      tabIndex={isInteractive ? 0 : undefined}
    >
      {children}
    </tr>
  );
}

export function TableCellNew({
  children,
  className,
  align = "left",
  header = false,
}: TableCellProps) {
  const Component = header ? "th" : "td";

  return (
    <Component
      className={twMerge(
        // Base styles
        "px-4 py-3",

        // Text alignment
        align === "left" && "text-left",
        align === "center" && "text-center",
        align === "right" && "text-right",

        // Header styles
        header && "text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider",

        // Cell styles
        !header && "text-sm text-gray-900 dark:text-gray-100",

        className,
      )}
    >
      {children}
    </Component>
  );
}
