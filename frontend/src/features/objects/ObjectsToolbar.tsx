import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  Eraser,
  Home,
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
import { useSearchCtrlF } from "./hooks/useSearchCtrlF";

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

  // Ctrl+F to focus search (Ctrl+F twice = browser search)
  useSearchCtrlF({
    searchInputRef,
    enabled: true,
    onCtrlF: () => setIsSearchExpanded(true),
  });

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
      // Use a small timeout to ensure the DOM has updated and transitions have started
      const timeoutId = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timeoutId);
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

  // Track screen width for responsive breadcrumbs
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);

  useEffect(() => {
    const checkScreenWidth = () => {
      setIsNarrowScreen(window.innerWidth < 768); // md breakpoint
    };
    checkScreenWidth();
    window.addEventListener("resize", checkScreenWidth);
    return () => window.removeEventListener("resize", checkScreenWidth);
  }, []);

  // Calculate visible breadcrumbs - responsive based on screen size
  const visibleBreadcrumbs = useMemo(() => {
    const maxVisible = isNarrowScreen ? 4 : 8; // Show fewer items on narrow screens

    if (breadcrumbs.length <= maxVisible) {
      return { items: breadcrumbs, hasHidden: false, hiddenCount: 0 };
    }

    // On narrow screens: show home, bucket, and last 2
    // On wide screens: show home, bucket, and last 6
    const itemsToShow = isNarrowScreen ? 2 : 6;
    const lastItems = breadcrumbs.slice(-itemsToShow);
    const firstTwo = breadcrumbs.slice(0, 2); // Always show home and bucket

    // Remove duplicates if bucket is already in lastItems
    const combined = [...firstTwo];
    lastItems.forEach((item) => {
      if (!combined.find((c) => c.label === item.label && c.value === item.value)) {
        combined.push(item);
      }
    });

    return {
      items: combined,
      hasHidden: true,
      hiddenCount: breadcrumbs.length - combined.length,
    };
  }, [breadcrumbs, isNarrowScreen]);

  return (
    <div className="flex flex-col gap-3 border-b border-ui-border px-3 py-3 dark:border-ui-border-dark sm:h-14 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-0">
      <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto sm:overflow-visible">
        {visibleBreadcrumbs.items.map((crumb, index) => {
          const isActive = crumb === breadcrumbs[breadcrumbs.length - 1];
          const canNavigate = crumb.value !== null || crumb.isHome;
          const isFirstAfterHome = index === 1 && visibleBreadcrumbs.hasHidden;

          return (
            <div key={`${crumb.label}-${index}`} className="flex shrink-0 items-center gap-0.5">
              {isFirstAfterHome && visibleBreadcrumbs.hasHidden ? (
                <>
                  <ChevronRight className="h-3 w-3 text-ui-text-subtle" aria-hidden="true" />
                  <button
                    type="button"
                    className="flex h-5 w-5 items-center justify-center rounded text-ui-text-muted transition hover:bg-ui-surface-active dark:text-ui-text-subtle dark:hover:bg-ui-surface-active-dark"
                    title={`${visibleBreadcrumbs.hiddenCount} hidden levels`}
                    aria-label={`${visibleBreadcrumbs.hiddenCount} hidden directory levels`}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </button>
                  <ChevronRight className="h-3 w-3 text-ui-text-subtle" aria-hidden="true" />
                </>
              ) : index > 0 ? (
                <ChevronRight className="h-3 w-3 text-ui-text-subtle" aria-hidden="true" />
              ) : null}

              {canNavigate ? (
                <button
                  type="button"
                  onClick={() => onBreadcrumbNavigate(crumb.value, crumb.isHome)}
                  className={`${
                    crumb.isHome
                      ? "inline-flex items-center justify-center p-0.5"
                      : "truncate px-1.5 py-0.5"
                  } rounded text-xs sm:text-sm transition hover:bg-ui-surface-active focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-primary-600 dark:hover:bg-ui-surface-active-dark ${
                    isActive
                      ? "font-semibold text-ui-text dark:text-ui-text-dark"
                      : "font-medium text-ui-text-muted dark:text-ui-text-subtle"
                  }`}
                  style={{ maxWidth: crumb.isHome ? "auto" : isActive ? "150px" : "100px" }}
                >
                  {crumb.isHome ? (
                    <Home className="h-3.5 w-3.5" aria-label="Dashboard" />
                  ) : (
                    crumb.label
                  )}
                </button>
              ) : (
                <span
                  className={`${
                    crumb.isHome
                      ? "inline-flex items-center justify-center p-0.5"
                      : "truncate px-1.5 py-0.5"
                  } text-xs sm:text-sm font-semibold text-ui-text dark:text-ui-text-dark`}
                  style={{ maxWidth: crumb.isHome ? "auto" : "150px" }}
                >
                  {crumb.isHome ? (
                    <Home className="h-3.5 w-3.5" aria-label="Dashboard" />
                  ) : (
                    crumb.label
                  )}
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
            isSearchExpanded ? "w-full pr-3 sm:w-64" : "w-9 justify-center px-0"
          }`}
        >
          <button
            type="button"
            data-testid="objects-toolbar-button-search-expand"
            onClick={handleSearchExpand}
            className="flex h-9 w-9 shrink-0 items-center justify-center pl-1 text-ui-text-subtle transition hover:text-ui-text focus-visible:outline-none focus-visible:text-ui-text dark:text-ui-text-muted-dark dark:hover:text-ui-text-dark dark:focus-visible:text-ui-text-dark"
            aria-label={isSearchExpanded ? "Search icon" : "Open search"}
            disabled={isSearchExpanded}
          >
            <Search className="h-4 w-4" />
          </button>

          <input
            ref={searchInputRef}
            data-testid="objects-toolbar-input-search"
            type="text"
            value={searchValue}
            onChange={(event) => handleSearchChange(event.target.value)}
            onBlur={handleSearchCollapse}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                if (!searchValue.trim()) {
                  // If empty, collapse the search bar
                  setIsSearchExpanded(false);
                  searchInputRef.current?.blur();
                } else {
                  // If not empty, clear the search field
                  setSearchValue("");
                  onSearchChange(undefined);
                }
              }
            }}
            placeholder="Search files..."
            aria-label={`Search objects in ${bucket}`}
            className={`min-w-0 flex-1 bg-transparent text-sm text-ui-text outline-none transition-all placeholder:text-ui-text-subtle dark:text-ui-text-dark dark:placeholder:text-ui-text-muted-dark ${
              isSearchExpanded ? "w-full opacity-100" : "invisible w-0 opacity-0"
            }`}
          />

          {searchValue && isSearchExpanded && (
            <button
              type="button"
              data-testid="objects-toolbar-button-search-clear"
              onClick={handleClearSearch}
              className="x-close-button flex shrink-0 items-center justify-center text-ui-text-subtle transition hover:text-ui-text dark:text-ui-text-muted-dark dark:hover:text-ui-text-dark"
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
              data-testid="objects-toolbar-button-more-actions"
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
          <Button
            type="button"
            data-testid="objects-toolbar-button-upload"
            className="h-9 w-9 p-0"
            onClick={onUploadClick}
          >
            <UploadCloud className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
