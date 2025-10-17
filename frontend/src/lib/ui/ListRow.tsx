import { ReactNode, HTMLAttributes, forwardRef } from "react";
import styles from "./ListRow.module.css";

/**
 * Props for the ListRow component
 */
export interface ListRowProps extends HTMLAttributes<HTMLTableRowElement> {
  /** Whether this row is currently focused via keyboard navigation */
  isFocused?: boolean;
  /** Whether this row is currently selected (for multi-select) */
  isSelected?: boolean;
  /** Variant style for different list types */
  variant?: "default" | "bucket";
  /** Children elements to render */
  children: ReactNode;
}

/**
 * Reusable table row component with keyboard navigation support
 *
 * Provides consistent styling for selected/focused states and
 * follows accessibility best practices for interactive lists.
 *
 * @example
 * ```tsx
 * <ListRow
 *   isFocused={focusedKey === item.key}
 *   role="button"
 *   tabIndex={0}
 *   onClick={() => handleSelect(item)}
 * >
 *   <TableCell>{item.name}</TableCell>
 * </ListRow>
 * ```
 */
export const ListRow = forwardRef<HTMLTableRowElement, ListRowProps>(
  ({ isFocused = false, isSelected = false, variant = "default", className, ...props }, ref) => {
    const rowClasses = [
      styles.listRow,
      isFocused && styles.focused,
      isSelected && styles.selected,
      variant === "bucket" && styles.bucket,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return <tr ref={ref} className={rowClasses} {...props} />;
  },
);

ListRow.displayName = "ListRow";
