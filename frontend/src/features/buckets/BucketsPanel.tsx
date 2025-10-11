import { useNavigate } from "@tanstack/react-router";
import { Loader2, Trash2 } from "lucide-react";
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

function renderSavings(bucket: Bucket) {
  const saved = bucket.original_bytes - bucket.stored_bytes;
  const pct = bucket.savings_pct;
  return `${formatBytes(saved)} (${pct.toFixed(1)}%)`;
}

export function BucketsPanel() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useBuckets();
  const deleteMutation = useDeleteBucket();

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
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
      <div className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-850 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Storage Buckets</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Manage and optimize your object storage containers</p>
      </div>
      <Table className="min-w-full">
        <TableHead>
          <tr className="bg-slate-50 dark:bg-slate-900/50">
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Name</th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Objects</th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Original Size</th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Compressed</th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Savings</th>
            <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 text-right">Actions</th>
          </tr>
        </TableHead>
        <TableBody>
          {data.map((bucket) => {
            const pendingDelete =
              deleteMutation.isPending && deleteMutation.variables === bucket.name;
            return (
              <TableRow
                key={bucket.name}
                className="group"
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate({
                      to: "/b/$bucket",
                      params: { bucket: bucket.name },
                      search: { ...DEFAULT_OBJECTS_SEARCH_STATE },
                    });
                  }
                }}
                onClick={() => {
                  navigate({
                    to: "/b/$bucket",
                    params: { bucket: bucket.name },
                    search: { ...DEFAULT_OBJECTS_SEARCH_STATE },
                  });
                }}
              >
                <TableCell className="px-6 py-4 font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">
                  <span className="inline-flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    {bucket.name}
                    {bucket.pending ? <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Pending</Badge> : null}
                  </span>
                </TableCell>
                <TableCell className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">{bucket.object_count.toLocaleString()}</TableCell>
                <TableCell className="px-6 py-4 text-slate-600 dark:text-slate-300">{formatBytes(bucket.original_bytes)}</TableCell>
                <TableCell className="px-6 py-4 text-slate-600 dark:text-slate-300">{formatBytes(bucket.stored_bytes)}</TableCell>
                <TableCell className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    {renderSavings(bucket)}
                  </span>
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
                      className="gap-1 border-slate-200 text-red-600 hover:bg-red-50 focus-visible:outline-red-500 dark:border-slate-800 dark:text-red-300 dark:hover:bg-red-900"
                      onClick={() => {
                        const confirmed = window.confirm(
                          `Delete bucket “${bucket.name}”? This cannot be undone.`,
                        );
                        if (!confirmed) return;
                        deleteMutation.mutate(bucket.name);
                      }}
                      disabled={pendingDelete}
                    >
                      {pendingDelete ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
