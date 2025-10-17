/**
 * Shared utility for generating consistent table row class names
 * with zebra striping, hover, and selection states.
 *
 * WCAG Contrast Compliance:
 * - Light mode: dark text on primary-100 background (warm rose tint)
 * - Dark mode: light text on primary-950/95 background
 * Both selections meet WCAG 2.1 Level AA requirements (4.5:1 minimum).
 */

interface TableRowStylesOptions {
  isSelected?: boolean;
  isHighlighted?: boolean;
}

const BASE_CLASSES =
  "cursor-pointer border-b border-ui-border-subtle transition-colors duration-fast focus-visible:outline-focus focus-visible:outline-offset-[-2px] focus-visible:outline-primary-600 dark:border-ui-border-subtle-dark dark:focus-visible:outline-primary-500";

/**
 * Generates consistent table row class names with zebra striping.
 *
 * Strategy: Conditional class application based on selection state,
 * avoiding !important by never mixing zebra and selection classes.
 *
 * @param options - Configuration for row state
 * @returns Complete className string for table row
 *
 * @example
 * ```tsx
 * <tr className={getTableRowClasses({ isSelected: true })}>
 * ```
 */
export function getTableRowClasses({
  isSelected = false,
  isHighlighted = false,
}: TableRowStylesOptions = {}): string {
  // When selected/highlighted, use selection colors that work in both light and dark mode
  if (isSelected || isHighlighted) {
    return `${BASE_CLASSES} bg-primary-100 text-primary-950 dark:bg-primary-950/95 dark:text-primary-100`;
  }

  // Otherwise use zebra striping with hover
  return `${BASE_CLASSES} odd:bg-black/5 dark:odd:bg-white/5 hover:bg-ui-surface-hover dark:hover:bg-ui-surface-hover-dark`;
}
