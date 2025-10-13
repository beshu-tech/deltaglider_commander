import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Eraser, RefreshCw, Search, UploadCloud } from "lucide-react";
import { ObjectsCompressionFilter } from "./types";
import { Input } from "../../lib/ui/Input";
import { Select } from "../../lib/ui/Select";
import { Button } from "../../lib/ui/Button";

export interface ObjectsToolbarProps {
  bucket: string;
  prefix: string;
  search: string | undefined;
  breadcrumbs: Array<{ label: string; value: string | null }>;
  compression: ObjectsCompressionFilter;
  onSearchChange: (value: string | undefined) => void;
  onCompressionChange: (value: ObjectsCompressionFilter) => void;
  onBreadcrumbNavigate: (value: string | null) => void;
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

  const compressionOptions = useMemo(
    () => [
      { value: "all" as const, label: "All files" },
      { value: "compressed" as const, label: "Compressed only" },
      { value: "original" as const, label: "Original only" },
    ],
    [],
  );

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

  return (
    <div className="flex flex-wrap items-center justify-between gap-group border-b border-slate-200 px-5 py-3 dark:border-slate-800">
      <nav className="flex flex-wrap items-center gap-inline text-body-sm text-slate-500 dark:text-slate-300">
        {breadcrumbs.map((crumb, index) => {
          const isActive = index === breadcrumbs.length - 1;
          return (
            <div key={`${crumb.label}-${index}`} className="flex items-center gap-inline">
              {crumb.value !== null ? (
                <button
                  type="button"
                  onClick={() => onBreadcrumbNavigate(crumb.value)}
                  className={`rounded-md px-2 py-1 text-body-sm transition hover:bg-slate-100 focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-brand-500 dark:hover:bg-slate-800 ${
                    isActive
                      ? "font-semibold text-slate-900 dark:text-slate-100"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="px-2 py-1 text-body-sm font-semibold text-slate-900 dark:text-slate-100">
                  {crumb.label}
                </span>
              )}
              {index < breadcrumbs.length - 1 ? (
                <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
              ) : null}
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
        <Select
          value={compression}
          onChange={(event) => onCompressionChange(event.target.value as ObjectsCompressionFilter)}
          aria-label="Filter by compression"
          className="appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMUw2IDZMMTEgMSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48L3N2Zz4=')] bg-[length:12px] bg-[right_0.75rem_center] bg-no-repeat pr-9"
        >
          {compressionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        {onClearCache ? (
          <button
            type="button"
            onClick={onClearCache}
            className="flex items-center justify-center rounded-md border border-slate-200 bg-surface-elevated p-2 text-slate-700 transition hover:bg-slate-50 focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-brand-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            title="Clear cache"
            aria-label="Clear cached directory listings"
          >
            <Eraser className="h-4 w-4" />
          </button>
        ) : null}
        {onForceRefresh ? (
          <button
            type="button"
            onClick={onForceRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center rounded-md border border-slate-200 bg-surface-elevated p-2 text-slate-700 transition hover:bg-slate-50 focus-visible:outline-focus focus-visible:outline-offset-focus focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            title="Refresh from server"
            aria-label="Refresh from server"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        ) : null}
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
