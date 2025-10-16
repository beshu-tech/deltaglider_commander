import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, Loader2, RefreshCcw, Trash2 } from "lucide-react";
import { Badge } from "../../lib/ui/Badge";
import { EmptyState } from "../../lib/ui/EmptyState";
import { Button } from "../../lib/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableRow } from "../../lib/ui/Table";
import { formatBytes } from "../../lib/utils/bytes";
import { Bucket } from "./types";
import { useBuckets } from "./useBuckets";
import { DEFAULT_OBJECTS_SEARCH_STATE } from "../objects/types";
import { BucketSavingsButton } from "../savings/BucketSavingsButton";
import { useDeleteBucket } from "./useBucketManagement";
import { useBucketStats } from "./useBucketStats";
import { useRefreshBucketStats } from "./useRefreshBucketStats";

function BucketRow({
  bucket,
  deleteMutation,
  variant = "table",
}: {
  bucket: Bucket;
  deleteMutation: ReturnType<typeof useDeleteBucket>;
  variant?: "table" | "card";
}) {
  const navigate = useNavigate();
  const statsQuery = useBucketStats(bucket, "sampled");
  const stats = statsQuery.data ?? bucket;
  const isError = statsQuery.isError;
  const isLoadingStats = !isError && (statsQuery.isPlaceholderData || statsQuery.isLoading);
  const pendingDelete = deleteMutation.isPending && deleteMutation.variables === bucket.name;
  const [displayObjectCount, setDisplayObjectCount] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const animationStartRef = useRef<number>(0);
  const animationDurationRef = useRef<number>(0);
  const lastTargetRef = useRef<number>(0);
  const hasAnimatedRef = useRef(false);

  const cancelAnimation = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  useEffect(() => {
    const ready = !isError && !isLoadingStats;
    if (!ready) {
      cancelAnimation();
      setDisplayObjectCount(0);
      hasAnimatedRef.current = false;
      lastTargetRef.current = 0;
      return;
    }

    const target = Math.max(0, stats.object_count);
    if (target === 0) {
      cancelAnimation();
      setDisplayObjectCount(0);
      hasAnimatedRef.current = true;
      lastTargetRef.current = 0;
      return;
    }

    if (hasAnimatedRef.current && target === lastTargetRef.current) {
      setDisplayObjectCount((prev) => (prev !== target ? target : prev));
      return;
    }

    cancelAnimation();
    lastTargetRef.current = target;
    hasAnimatedRef.current = false;
    animationStartRef.current = performance.now();
    animationDurationRef.current = Math.random() * 2000 + 1000; // 1s to 3s
    setDisplayObjectCount(0);

    const step = (now: number) => {
      const elapsed = now - animationStartRef.current;
      const duration = animationDurationRef.current;
      const progress = duration === 0 ? 1 : Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const nextValue = Math.round(target * eased);
      setDisplayObjectCount(nextValue);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        animationFrameRef.current = null;
        hasAnimatedRef.current = true;
        setDisplayObjectCount(target);
      }
    };

    animationFrameRef.current = requestAnimationFrame(step);

    return cancelAnimation;
  }, [isError, isLoadingStats, stats.object_count]);

  const goToBucket = () => {
    navigate({
      to: "/b/$bucket",
      params: { bucket: bucket.name },
      search: { ...DEFAULT_OBJECTS_SEARCH_STATE },
    });
  };

  const spinner = (
    <span className="inline-flex items-center gap-1 text-slate-400">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span className="sr-only">Loading bucket stats</span>
    </span>
  );

  const errorIndicator = (
    <span
      className="text-xs font-medium text-red-600 dark:text-red-400"
      title="Unable to load stats"
    >
      Error
    </span>
  );

  const originalBytes = Math.max(0, stats.original_bytes);
  const rawSavedBytes = Math.max(0, originalBytes - stats.stored_bytes);
  const savedBytes = rawSavedBytes;
  const savedPct = originalBytes === 0 ? 0 : Math.min(100, (savedBytes / originalBytes) * 100);
  const hasSavings = savedBytes > 0;

  if (variant === "card") {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-500/50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={goToBucket}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <span className="text-base font-semibold text-slate-900 dark:text-white">
              {bucket.name}
            </span>
            {bucket.pending ? (
              <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                Pending
              </Badge>
            ) : null}
          </span>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </button>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Objects
            </p>
            <div className="mt-1 text-slate-900 dark:text-slate-100">
              {isError ? (
                <span className="text-red-600 dark:text-red-400">Error</span>
              ) : isLoadingStats ? (
                <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading
                </span>
              ) : (
                displayObjectCount.toLocaleString()
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Size
            </p>
            <div className="mt-1 flex flex-col text-slate-900 dark:text-slate-100">
              {isError ? (
                <span className="text-red-600 dark:text-red-400">Error</span>
              ) : isLoadingStats ? (
                <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading
                </span>
              ) : stats.stored_bytes !== stats.original_bytes ? (
                <>
                  <span className="font-medium">{formatBytes(stats.stored_bytes)}</span>
                  <span className="text-xs text-slate-400 line-through">
                    {formatBytes(stats.original_bytes)}
                  </span>
                </>
              ) : (
                <span className="font-medium">{formatBytes(stats.original_bytes)}</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Savings
            </p>
            <div className="mt-1 text-slate-900 dark:text-slate-100">
              {isError ? (
                <span className="text-red-600 dark:text-red-400">Error</span>
              ) : isLoadingStats ? (
                <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading
                </span>
              ) : hasSavings ? (
                `${formatBytes(savedBytes)} (${savedPct.toFixed(1)}%)`
              ) : (
                "0 B (0.0%)"
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <BucketSavingsButton bucket={bucket.name} disabled={bucket.pending} />
          <Button
            variant="ghost"
            className="h-9 rounded-md border border-slate-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 focus-visible:outline-red-500 dark:border-slate-700 dark:text-red-400 dark:hover:bg-red-950"
            onClick={(event) => {
              event.stopPropagation();
              const confirmed = window.confirm(
                `Delete bucket "${bucket.name}"? This cannot be undone.`,
              );
              if (!confirmed) return;
              deleteMutation.mutate(bucket.name);
            }}
            disabled={pendingDelete}
            aria-label={pendingDelete ? "Deleting..." : `Delete bucket ${bucket.name}`}
            title={pendingDelete ? "Deleting..." : `Delete bucket ${bucket.name}`}
          >
            {pendingDelete ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TableRow
      className="group"
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          goToBucket();
        }
      }}
      onClick={goToBucket}
    >
      <TableCell className="px-6 py-4 font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">
        <span className="inline-flex items-center gap-2">
          <svg
            className="w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          {bucket.name}
          {bucket.pending ? (
            <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
              Pending
            </Badge>
          ) : null}
        </span>
      </TableCell>
      <TableCell className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">
        {isError ? errorIndicator : isLoadingStats ? spinner : displayObjectCount.toLocaleString()}
      </TableCell>
      <TableCell className="px-6 py-4">
        {isError ? (
          errorIndicator
        ) : isLoadingStats ? (
          spinner
        ) : stats.stored_bytes !== stats.original_bytes ? (
          <span className="flex flex-col text-sm">
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {formatBytes(stats.stored_bytes)}
            </span>
            <span className="text-xs text-slate-400 line-through">
              {formatBytes(stats.original_bytes)}
            </span>
          </span>
        ) : (
          <span className="font-medium text-slate-600 dark:text-slate-300">
            {formatBytes(stats.original_bytes)}
          </span>
        )}
      </TableCell>
      <TableCell className="px-6 py-4">
        {isError ? (
          errorIndicator
        ) : (
          <span
            className={
              hasSavings
                ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300"
            }
          >
            {isLoadingStats ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                <span className="sr-only">Loading bucket savings</span>
              </>
            ) : hasSavings ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h12M4 14h8M4 18h4"
                  />
                </svg>
                {`${formatBytes(savedBytes)} (${savedPct.toFixed(1)}%)`}
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="6" strokeWidth={2} />
                  <path strokeWidth={2} strokeLinecap="round" d="M9 12h6" />
                </svg>
                0 B (0.0%)
              </>
            )}
          </span>
        )}
      </TableCell>
      <TableCell
        className="px-6 py-4 text-right"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="flex items-center justify-end gap-2">
          <BucketSavingsButton bucket={bucket.name} disabled={bucket.pending} />
          <Button
            variant="ghost"
            className="h-9 w-9 p-0 text-red-600 hover:bg-red-50 focus-visible:outline-red-500 dark:text-red-400 dark:hover:bg-red-950"
            onClick={() => {
              const confirmed = window.confirm(
                `Delete bucket "${bucket.name}"? This cannot be undone.`,
              );
              if (!confirmed) return;
              deleteMutation.mutate(bucket.name);
            }}
            disabled={pendingDelete}
            aria-label={pendingDelete ? "Deleting..." : `Delete bucket ${bucket.name}`}
            title={pendingDelete ? "Deleting..." : `Delete bucket ${bucket.name}`}
          >
            {pendingDelete ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function BucketsPanel() {
  const { data, isLoading, isError, error } = useBuckets();
  const deleteMutation = useDeleteBucket();
  const refreshMutation = useRefreshBucketStats();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (isError) {
    // For authentication errors, the authInterceptor will handle the redirect
    // We'll still show a message briefly before the redirect happens
    return <EmptyState title="Could not load buckets" message={String(error)} />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title="No buckets" message="No DeltaGlider buckets were found." />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-surface-elevated shadow-elevation-md dark:border-slate-800 dark:bg-slate-900 dark:shadow-elevation-md-dark">
      <div className="bg-slate-50 dark:bg-slate-900/50 px-group py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-title-sm text-slate-900 dark:text-white">Storage Buckets</h2>
          <p className="text-body-sm text-slate-600 dark:text-slate-400 mt-1">
            Manage and optimize your object storage containers
          </p>
        </div>
        <Button
          variant="secondary"
          className="gap-2"
          disabled={refreshMutation.isPending}
          onClick={() => refreshMutation.mutate("sampled")}
        >
          {refreshMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              Rebuild stats
            </>
          )}
        </Button>
      </div>
      <div className="hidden md:block">
        <Table className="min-w-full">
          <TableHead>
            <tr className="bg-slate-50 dark:bg-slate-900/50">
              <th className="px-6 py-3 text-label-sm uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Name
              </th>
              <th className="px-6 py-3 text-label-sm uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Objects
              </th>
              <th className="px-6 py-3 text-label-sm uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Size
              </th>
              <th className="px-6 py-3 text-label-sm uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Savings
              </th>
              <th className="px-6 py-3 text-label-sm uppercase tracking-wider text-slate-600 dark:text-slate-400 text-right">
                Actions
              </th>
            </tr>
          </TableHead>
          <TableBody>
            {data.map((bucket) => (
              <BucketRow
                key={`${bucket.name}-table`}
                bucket={bucket}
                deleteMutation={deleteMutation}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40 md:hidden">
        {data.map((bucket) => (
          <BucketRow
            key={`${bucket.name}-card`}
            bucket={bucket}
            deleteMutation={deleteMutation}
            variant="card"
          />
        ))}
      </div>
    </div>
  );
}
