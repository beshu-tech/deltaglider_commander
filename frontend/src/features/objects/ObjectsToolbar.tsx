import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  Eraser,
  MoreHorizontal,
  MoreVertical,
  RefreshCw,
  Search,
  UploadCloud,
  X,
} from "lucide-react";
import { ObjectsCompressionFilter } from "./types";
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
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSearchValue(search || "");
  }, [search]);

  // Expand search when there's a search value
  useEffect(() => {
    if (search) {
      setIsSearchExpanded(true);
    }
  }, [search]);

  // Auto-focus input when expanded
  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  const handleSearchExpand = () => {
    setIsSearchExpanded(true);
  };

  const handleSearchCollapse = () => {
    // Only collapse if the search field is empty
    if (!searchValue.trim()) {
      setIsSearchExpanded(false);
    }
    // If there's a search value, keep it expanded so users can see their search
  };

  const handleClearSearch = () => {
    setSearchValue("");
    onSearchChange(undefined);
    setIsSearchExpanded(false);
  };

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
    <div className="flex flex-col gap-3 border-b border-ui-border px-3 py-3 dark:border-ui-border-dark sm:h-14 sm:flex-row sm:items-center sm:justify-between sm:gap-group sm:px-5 sm:py-0">
      <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto sm:overflow-visible">
        {visibleBreadcrumbs.items.map((crumb, index) => {
          const isActive = crumb === breadcrumbs[breadcrumbs.length - 1];
          const canNavigate = crumb.value !== null || crumb.isHome;
          const isFirstAfterHome = index === 1 && visibleBreadcrumbs.hasHidden;

          return (
            <div key={`${crumb.label}-${index}`} className="flex shrink-0 items-center gap-1">
              {isFirstAfterHome && visibleBreadcrumbs.hasHidden ? (
                <>
                  <ChevronRight className="h-4 w-4 text-ui-text-subtle" aria-hidden="true" />
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-ui-text-muted transition hover:bg-ui-surface-active dark:text-ui-text-subtle dark:hover:bg-ui-surface-active-dark"
                    title={`${visibleBreadcrumbs.hiddenCount} hidden levels`}
                    aria-label={`${visibleBreadcrumbs.hiddenCount} hidden directory levels`}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  <ChevronRight className="h-4 w-4 text-ui-text-subtle" aria-hidden="true" />
                </>
              ) : index > 0 ? (
                <ChevronRight className="h-4 w-4 text-ui-text-subtle" aria-hidden="true" />
              ) : null}

              {canNavigate ? (
                <button
                  type="button"
                  onClick={() => onBreadcrumbNavigate(crumb.value, crumb.isHome)}
                  className={`truncate rounded-md px-2 py-1 text-sm transition hover:bg-ui-surface-active focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-primary-600 dark:hover:bg-ui-surface-active-dark ${
                    isActive
                      ? "font-semibold text-ui-text dark:text-ui-text-dark"
                      : "font-medium text-ui-text-muted dark:text-ui-text-subtle"
                  }`}
                  style={{ maxWidth: isActive ? "200px" : "150px" }}
                >
                  {crumb.label}
                </button>
              ) : (
                <span
                  className="truncate px-2 py-1 text-sm font-semibold text-ui-text dark:text-ui-text-dark"
                  style={{ maxWidth: "200px" }}
                >
                  {crumb.label}
                </span>
              )}
            </div>
          );
        })}
      </nav>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
        <form
          onSubmit={handleSubmit}
          className={`flex h-9 items-center gap-2 rounded-md border border-ui-border bg-surface-elevated transition-all duration-300 ease-out dark:border-ui-border-dark dark:bg-ui-surface-active-dark ${
            isSearchExpanded ? "w-full px-3 sm:w-64" : "w-9 justify-center px-0"
          }`}
        >
          <button
            type="button"
            onClick={handleSearchExpand}
            className="flex shrink-0 items-center justify-center text-ui-text-subtle transition hover:text-ui-text focus-visible:outline-none focus-visible:text-ui-text dark:text-ui-text-muted-dark dark:hover:text-ui-text-dark dark:focus-visible:text-ui-text-dark"
            aria-label={isSearchExpanded ? "Search icon" : "Open search"}
            disabled={isSearchExpanded}
          >
            <Search className="h-4 w-4" />
          </button>

          <input
            ref={searchInputRef}
            type="text"
            value={searchValue}
            onChange={(event) => handleSearchChange(event.target.value)}
            onBlur={handleSearchCollapse}
            placeholder="Search files..."
            aria-label={`Search objects in ${bucket}`}
            className={`min-w-0 flex-1 bg-transparent text-sm text-ui-text outline-none transition-all placeholder:text-ui-text-subtle dark:text-ui-text-dark dark:placeholder:text-ui-text-muted-dark ${
              isSearchExpanded ? "w-full opacity-100" : "invisible w-0 opacity-0"
            }`}
          />

          {searchValue && isSearchExpanded && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="flex shrink-0 items-center justify-center text-ui-text-subtle transition hover:text-ui-text focus-visible:outline-none focus-visible:text-ui-text dark:text-ui-text-muted-dark dark:hover:text-ui-text-dark dark:focus-visible:text-ui-text-dark"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        <DropdownMenu
          trigger={
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-ui-border bg-surface-elevated text-ui-text transition hover:bg-ui-bg-subtle focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-primary-600 dark:border-ui-border-dark dark:bg-ui-surface-active-dark dark:text-ui-text-muted-dark dark:hover:bg-ui-surface-hover-dark"
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

          <div className="my-1 border-t border-ui-border dark:border-ui-border-dark" />

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
          <Button type="button" className="h-9 w-9 p-0" onClick={onUploadClick}>
            <UploadCloud className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
