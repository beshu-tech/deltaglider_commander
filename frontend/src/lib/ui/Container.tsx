import { ReactNode } from "react";

type ContainerVariant = "full" | "content" | "narrow";

interface ContainerProps {
  children: ReactNode;
  variant?: ContainerVariant;
  className?: string;
  as?: "div" | "main" | "section" | "article";
}

/**
 * Container component implementing 12-column grid system with consistent padding
 *
 * Variants:
 * - full: Maximum width with 32px padding (default)
 * - content: Content-focused width (1280px max)
 * - narrow: Narrow content width (960px max)
 *
 * Features:
 * - Enforces minimum 32px outer padding
 * - 12-column CSS Grid with responsive breakpoints
 * - Ensures vertical rhythm alignment
 */
export function Container({
  children,
  variant = "full",
  className = "",
  as: Component = "div",
}: ContainerProps) {
  const variantClasses = {
    full: "w-full",
    content: "w-full max-w-[1280px]",
    narrow: "w-full max-w-[960px]",
  };

  return (
    <Component
      className={`
        mx-auto
        px-section
        ${variantClasses[variant]}
        ${className}
      `.trim()}
    >
      {children}
    </Component>
  );
}

/**
 * Grid component for 12-column layouts
 *
 * Usage:
 * <Grid>
 *   <Grid.Column span={6}>Half width</Grid.Column>
 *   <Grid.Column span={6}>Half width</Grid.Column>
 * </Grid>
 */
interface GridProps {
  children: ReactNode;
  className?: string;
  gap?: "inline" | "item" | "group" | "block" | "section";
}

export function Grid({ children, className = "", gap = "group" }: GridProps) {
  const gapClasses = {
    inline: "gap-2",
    item: "gap-3",
    group: "gap-4",
    block: "gap-6",
    section: "gap-8",
  };

  return (
    <div
      className={`
        grid
        grid-cols-12
        ${gapClasses[gap]}
        ${className}
      `.trim()}
    >
      {children}
    </div>
  );
}

interface GridColumnProps {
  children: ReactNode;
  span?: number;
  spanMd?: number;
  spanLg?: number;
  className?: string;
}

function GridColumn({ children, span = 12, spanMd, spanLg, className = "" }: GridColumnProps) {
  const spanClass = `col-span-${span}`;
  const spanMdClass = spanMd ? `md:col-span-${spanMd}` : "";
  const spanLgClass = spanLg ? `lg:col-span-${spanLg}` : "";

  return (
    <div className={`${spanClass} ${spanMdClass} ${spanLgClass} ${className}`.trim()}>
      {children}
    </div>
  );
}

Grid.Column = GridColumn;
