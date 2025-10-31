import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Archive, Loader2, Plus } from "lucide-react";

import { DEFAULT_OBJECTS_SEARCH_STATE } from "../../../features/objects/types";
import { Badge } from "../../../lib/ui/Badge";
import { getErrorMessage } from "../../../lib/api/client";
import type { useBuckets } from "../../../features/buckets/useBuckets";

export interface BucketListProps {
  buckets: ReturnType<typeof useBuckets>["data"];
  isLoading: boolean;
  error: unknown;
  filter: string;
  activeBucket: string | null;
  onCreateClick: () => void;
}

export function BucketList({
  buckets,
  isLoading,
  error,
  filter,
  activeBucket,
  onCreateClick,
}: BucketListProps) {
  const filteredBuckets = useMemo(() => {
    if (!buckets) {
      return [];
    }
    const term = filter.trim().toLowerCase();
    if (!term) {
      return buckets;
    }
    return buckets.filter((bucket) => bucket.name.toLowerCase().includes(term));
  }, [buckets, filter]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-ui-text-muted dark:text-ui-text-muted-dark">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading buckets…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-primary-50 px-3 py-2 text-xs text-primary-700 dark:bg-white/10 dark:text-primary-200">
        Could not load buckets: {getErrorMessage(error)}
      </div>
    );
  }

  if (!filteredBuckets.length) {
    return (
      <div className="rounded-md px-3 py-2 text-xs text-ui-text-muted dark:text-ui-text-muted-dark">
        No buckets {filter ? "match the filter" : "available"}.
      </div>
    );
  }

  const isDashboardActive = activeBucket === null;

  return (
    <nav className="flex flex-col gap-1.5 text-sm">
      <Link
        to="/buckets"
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-900 ${
          isDashboardActive
            ? "bg-gradient-to-r from-primary-100 to-primary-50 text-primary-900 shadow-sm dark:from-primary-900/10 dark:to-primary-900/5 dark:text-primary-100"
            : "text-ui-text-muted hover:bg-ui-surface-hover hover:text-ui-text dark:text-ui-text-muted-dark dark:hover:bg-ui-surface-active-dark/50 dark:hover:text-white"
        }`}
        aria-current={isDashboardActive ? "page" : undefined}
      >
        <span className="flex min-w-0 items-center gap-3">
          <svg
            className="h-4 w-4 flex-shrink-0 text-primary-700 dark:text-primary-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          <span className="truncate font-medium">Dashboard</span>
        </span>
      </Link>

      {filteredBuckets.map((bucket) => {
        const isActive = activeBucket === bucket.name;
        return (
          <div key={bucket.name} className="group/bucket relative">
            <Link
              to="/b/$bucket"
              params={{ bucket: bucket.name }}
              search={DEFAULT_OBJECTS_SEARCH_STATE}
              className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-900 ${
                isActive
                  ? "border-primary-600/20 bg-gradient-to-r from-primary-100 to-primary-50 text-primary-900 shadow-sm dark:border-primary-500/20 dark:from-primary-900/10 dark:to-primary-900/5 dark:text-primary-100"
                  : "border-transparent text-ui-text-muted hover:bg-ui-surface-hover hover:text-ui-text dark:text-ui-text-muted-dark dark:hover:bg-ui-surface-active-dark/50 dark:hover:text-white"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="flex min-w-0 items-center gap-3">
                <Archive className="h-4 w-4 flex-shrink-0" />
                <span className="truncate font-medium">{bucket.name}</span>
              </span>
              {bucket.pending ? (
                <Badge className="border-ui-border bg-ui-surface-active text-[10px] font-medium uppercase text-ui-text-muted dark:border-ui-border-dark dark:bg-ui-surface-active-dark dark:text-ui-text-muted-dark">
                  Pending
                </Badge>
              ) : null}
            </Link>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onCreateClick();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-primary-900/90 p-1.5 text-white opacity-0 transition-opacity duration-200 hover:bg-primary-800 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-900 group-hover/bucket:opacity-100"
              aria-label="Create new bucket"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </nav>
  );
}

export default BucketList;
