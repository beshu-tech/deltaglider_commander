import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  Eraser,
  MoreHorizontal,
  MoreVertical,
  RefreshCw,
  Search,
  UploadCloud,
} from "lucide-react";
import { ObjectsCompressionFilter } from "./types";
import { Input } from "../../lib/ui/Input";
import { Button } from "../../lib/ui/Button";
import { DropdownMenu, DropdownMenuItem } from "../../lib/ui/DropdownMenu";

export interface ObjectsToolbarProps {
  bucket: string;
  prefix: string;
  search: string | undefined;
  breadcrumbs: Array<{ label: string; value: string | null; isHome?: boolean }>;
  compression: ObjectsCompressionFilter;
  onSearchChange: (value: string | undefined) => void;
  onCompressionChange: (value: ObjectsCompressionFilter) => void;
  onBreadcrumbNavigate: (value: string | null, isHome?: boolean) => void;
  onUploadClick?: () => void;
  onForceRefresh?: () => void;
  onClearCache?: () => void;
  isRefreshing?: boolean;
}

export function ObjectsToolbar({
  bucket,
  search,
  breadcrumbs,
  compression,
  onSearchChange,
  onCompressionChange,
  onBreadcrumbNavigate,
  onUploadClick,
  onForceRefresh,
  onClearCache,
  isRefreshing = false,
}: ObjectsToolbarProps) {
  const [searchValue, setSearchValue] = useState(search || "");
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setSearchValue(search || "");
  }, [search]);

  const debouncedSearch = useCallback(
    (value: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        const trimmed = value.trim();
        onSearchChange(trimmed || undefined);
      }, 150); // Reduced from 1000ms to 150ms for client-side filtering
    },
    [onSearchChange],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      debouncedSearch(value);
    },
    [debouncedSearch],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    const trimmed = searchValue.trim();
    onSearchChange(trimmed || undefined);
  };

  // Calculate visible breadcrumbs - show rightmost items when path is too deep
  const visibleBreadcrumbs = useMemo(() => {
    const MAX_VISIBLE = 8; // Show max 8 breadcrumb segments (plenty of room in typical layouts)
    if (breadcrumbs.length <= MAX_VISIBLE) {
      return { items: breadcrumbs, hasHidden: false, hiddenCount: 0 };
    }
    // Always show first (Dashboard) and last 3 items, collapse the middle
    const lastThree = breadcrumbs.slice(-3);
    const first = breadcrumbs[0];
    return {
      items: [first, ...lastThree],
      hasHidden: true,
      hiddenCount: breadcrumbs.length - 4,
    };
  }, [breadcrumbs]);

  return (
    <div className="flex h-14 items-center justify-between gap-group border-b border-slate-200 px-5 dark:border-slate-800">
      <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
        {visibleBreadcrumbs.items.map((crumb, index) => {
          const isActive = crumb === breadcrumbs[breadcrumbs.length - 1];
          const canNavigate = crumb.value !== null || crumb.isHome;
          const isFirstAfterHome = index === 1 && visibleBreadcrumbs.hasHidden;

          return (
            <div key={`${crumb.label}-${index}`} className="flex shrink-0 items-center gap-1">
              {isFirstAfterHome && visibleBreadcrumbs.hasHidden ? (
                <>
                  <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    title={`${visibleBreadcrumbs.hiddenCount} hidden levels`}
                    aria-label={`${visibleBreadcrumbs.hiddenCount} hidden directory levels`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                </>
              ) : index > 0 ? (
                <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
              ) : null}

              {canNavigate ? (
                <button
                  type="button"
                  onClick={() => onBreadcrumbNavigate(crumb.value, crumb.isHome)}
                  className={`truncate rounded-md px-2 py-1 text-sm transition hover:bg-slate-100 focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-brand-500 dark:hover:bg-slate-800 ${
                    isActive
                      ? "font-semibold text-slate-900 dark:text-slate-100"
                      : "font-medium text-slate-600 dark:text-slate-400"
                  }`}
                  style={{ maxWidth: isActive ? "200px" : "150px" }}
                >
                  {crumb.label}
                </button>
              ) : (
                <span
                  className="truncate px-2 py-1 text-sm font-semibold text-slate-900 dark:text-slate-100"
                  style={{ maxWidth: "200px" }}
                >
                  {crumb.label}
                </span>
              )}
            </div>
          );
        })}
      </nav>
      <div className="flex flex-wrap items-center gap-item">
        <form onSubmit={handleSubmit} className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchValue}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Search files..."
            className="w-64 pl-9"
            aria-label={`Search objects in ${bucket}`}
          />
        </form>

        <DropdownMenu
          trigger={
            <button
              type="button"
              className="flex items-center justify-center rounded-md border border-slate-200 bg-surface-elevated p-2 text-slate-700 transition hover:bg-slate-50 focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              aria-label="More actions"
              title="More actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          }
          align="right"
        >
          <DropdownMenuItem
            onClick={() => onCompressionChange("all")}
            disabled={compression === "all"}
          >
            <span className={compression === "all" ? "font-semibold" : ""}>All files</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onCompressionChange("compressed")}
            disabled={compression === "compressed"}
          >
            <span className={compression === "compressed" ? "font-semibold" : ""}>
              Compressed only
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onCompressionChange("original")}
            disabled={compression === "original"}
          >
            <span className={compression === "original" ? "font-semibold" : ""}>Original only</span>
          </DropdownMenuItem>

          <div className="my-1 border-t border-slate-200 dark:border-slate-700" />

          {onForceRefresh ? (
            <DropdownMenuItem onClick={onForceRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh from server</span>
            </DropdownMenuItem>
          ) : null}

          {onClearCache ? (
            <DropdownMenuItem onClick={onClearCache}>
              <Eraser className="h-4 w-4" />
              <span>Clear cache</span>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenu>

        {onUploadClick ? (
          <Button type="button" className="gap-2" onClick={onUploadClick}>
            <UploadCloud className="h-4 w-4" />
            Upload
          </Button>
        ) : null}
      </div>
    </div>
  );
}
