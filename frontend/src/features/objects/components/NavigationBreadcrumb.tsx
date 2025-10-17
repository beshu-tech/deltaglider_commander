import { ChevronRight, Home } from "lucide-react";
import { useMemo, useCallback } from "react";

/**
 * Navigation breadcrumb trail
 *
 * Shows navigation path with clickable segments for quick navigation.
 * Integrates with FSM history for accurate path tracking.
 *
 * @example
 * ```typescript
 * <NavigationBreadcrumb
 *   bucket="my-bucket"
 *   prefix="folder1/folder2/"
 *   onNavigate={(path) => navigate(path)}
 * />
 * ```
 */

export interface BreadcrumbSegment {
  label: string;
  path: string;
  isLast: boolean;
}

export interface NavigationBreadcrumbProps {
  /** Current bucket name */
  bucket?: string;

  /** Current prefix (folder path) */
  prefix?: string;

  /** Callback when segment clicked */
  onNavigate: (path: { bucket?: string; prefix?: string }) => void;

  /** Show home button */
  showHome?: boolean;
}

export function NavigationBreadcrumb({
  bucket,
  prefix = "",
  onNavigate,
  showHome = true,
}: NavigationBreadcrumbProps) {
  const segments = useMemo(() => {
    const result: BreadcrumbSegment[] = [];

    // Home segment
    if (showHome) {
      result.push({
        label: "Buckets",
        path: "/",
        isLast: !bucket,
      });
    }

    // Bucket segment
    if (bucket) {
      result.push({
        label: bucket,
        path: `/b/${bucket}`,
        isLast: !prefix,
      });

      // Folder segments
      if (prefix) {
        const parts = prefix.split("/").filter(Boolean);
        let accumulatedPath = "";

        parts.forEach((part, index) => {
          accumulatedPath += `${part}/`;
          result.push({
            label: part,
            path: `/b/${bucket}?prefix=${encodeURIComponent(accumulatedPath)}`,
            isLast: index === parts.length - 1,
          });
        });
      }
    }

    return result;
  }, [bucket, prefix, showHome]);

  const handleClick = useCallback(
    (segment: BreadcrumbSegment, event: React.MouseEvent) => {
      event.preventDefault();

      if (segment.label === "Buckets") {
        onNavigate({});
      } else if (segment.label === bucket) {
        onNavigate({ bucket, prefix: "" });
      } else {
        // Extract prefix from path
        const prefixMatch = segment.path.match(/prefix=([^&]+)/);
        const targetPrefix = prefixMatch ? decodeURIComponent(prefixMatch[1]) : "";
        onNavigate({ bucket, prefix: targetPrefix });
      }
    },
    [bucket, onNavigate],
  );

  if (segments.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-sm text-ui-text-muted dark:text-ui-text-muted-dark"
    >
      <ol className="flex items-center gap-1">
        {segments.map((segment, index) => (
          <li key={segment.path} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight
                className="h-4 w-4 text-ui-text-subtle dark:text-ui-text-subtle-dark"
                aria-hidden="true"
              />
            )}
            {segment.isLast ? (
              <span className="font-medium text-ui-text dark:text-ui-text-dark" aria-current="page">
                {index === 0 && showHome && <Home className="inline h-4 w-4 mr-1" />}
                {segment.label}
              </span>
            ) : (
              <button
                onClick={(e) => handleClick(segment, e)}
                className="flex items-center gap-1 transition-colors hover:text-ui-text hover:underline dark:hover:text-ui-text-dark"
              >
                {index === 0 && showHome && <Home className="inline h-4 w-4" />}
                {segment.label}
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Compact breadcrumb for mobile/small screens
 *
 * Shows only last 2 segments with ellipsis for the rest.
 */
export function CompactBreadcrumb({
  bucket,
  prefix = "",
  onNavigate,
}: Omit<NavigationBreadcrumbProps, "showHome">) {
  const segments = useMemo(() => {
    const result: BreadcrumbSegment[] = [];

    if (bucket) {
      result.push({
        label: bucket,
        path: `/b/${bucket}`,
        isLast: !prefix,
      });

      if (prefix) {
        const parts = prefix.split("/").filter(Boolean);
        let accumulatedPath = "";

        parts.forEach((part, index) => {
          accumulatedPath += `${part}/`;
          result.push({
            label: part,
            path: `/b/${bucket}?prefix=${encodeURIComponent(accumulatedPath)}`,
            isLast: index === parts.length - 1,
          });
        });
      }
    }

    return result;
  }, [bucket, prefix]);

  if (segments.length === 0) return null;

  // Show only last 2 segments
  const visibleSegments = segments.slice(-2);
  const hasMore = segments.length > 2;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-sm text-ui-text-muted dark:text-ui-text-muted-dark"
    >
      <ol className="flex items-center gap-1">
        {hasMore && (
          <li className="flex items-center gap-1">
            <button
              onClick={() => onNavigate({ bucket })}
              className="text-ui-text-subtle transition-colors hover:text-ui-text dark:text-ui-text-subtle-dark dark:hover:text-ui-text-dark"
              aria-label="Go to bucket root"
            >
              ...
            </button>
            <ChevronRight
              className="h-4 w-4 text-ui-text-subtle dark:text-ui-text-subtle-dark"
              aria-hidden="true"
            />
          </li>
        )}
        {visibleSegments.map((segment, index) => (
          <li key={segment.path} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight
                className="h-4 w-4 text-ui-text-subtle dark:text-ui-text-subtle-dark"
                aria-hidden="true"
              />
            )}
            {segment.isLast ? (
              <span className="font-medium text-ui-text dark:text-ui-text-dark" aria-current="page">
                {segment.label}
              </span>
            ) : (
              <button
                onClick={() => {
                  const prefixMatch = segment.path.match(/prefix=([^&]+)/);
                  const targetPrefix = prefixMatch ? decodeURIComponent(prefixMatch[1]) : "";
                  onNavigate({ bucket, prefix: targetPrefix });
                }}
                className="transition-colors hover:text-ui-text hover:underline dark:hover:text-ui-text-dark"
              >
                {segment.label}
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
