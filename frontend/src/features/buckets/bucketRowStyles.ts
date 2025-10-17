/**
 * Shared utility for generating consistent bucket row class names
 * with zebra striping, hover, and focus states.
 *
 * WCAG Contrast Compliance:
 * - Light mode: dark text on primary-100 background (warm rose tint)
 * - Dark mode: light text on primary-950/95 background
 * Both selections meet WCAG 2.1 Level AA requirements (4.5:1 minimum).
 */

interface BucketRowStylesOptions {
  isFocused?: boolean;
}

const BASE_CLASSES =
  "group cursor-pointer border-b border-ui-border/70 last:border-0 transition-colors duration-fast dark:border-ui-border-dark/70 outline-none focus:outline-none";

const ZEBRA_CLASSES = "odd:bg-black/5 dark:odd:bg-white/5";
const FOCUSED_CLASSES =
  "!bg-primary-100 !text-primary-950 dark:!bg-primary-950/95 dark:!text-primary-100";

/**
 * Generates consistent bucket row class names with zebra striping.
 *
 * @param options - Configuration for row state
 * @returns Complete className string for bucket row
 *
 * @example
 * ```tsx
 * <TableRow className={getBucketRowClasses({ isFocused: true })}>
 * ```
 */
export function getBucketRowClasses({ isFocused = false }: BucketRowStylesOptions = {}): string {
  const stateClasses = isFocused ? FOCUSED_CLASSES : ZEBRA_CLASSES;
  return `${BASE_CLASSES} ${stateClasses}`;
}
