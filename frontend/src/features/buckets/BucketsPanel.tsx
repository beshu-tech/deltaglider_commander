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
    return <EmptyState title="Could not load buckets" message={String(error)} />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title="No buckets" message="No DeltaGlider buckets were found." />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Table className="min-w-full">
        <TableHead>
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Objects</th>
            <th className="px-3 py-2">Original</th>
            <th className="px-3 py-2">Stored</th>
            <th className="px-3 py-2">Savings</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </TableHead>
        <TableBody>
          {data.map((bucket) => {
            const pendingDelete = deleteMutation.isPending && deleteMutation.variables === bucket.name;
            return (
              <TableRow
                key={bucket.name}
                className="group"
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate({ to: "/b/$bucket", params: { bucket: bucket.name }, search: { ...DEFAULT_OBJECTS_SEARCH_STATE } });
                  }
                }}
                onClick={() => {
                  navigate({
                    to: "/b/$bucket",
                    params: { bucket: bucket.name },
                    search: { ...DEFAULT_OBJECTS_SEARCH_STATE }
                  });
                }}
              >
              <TableCell className="font-medium text-brand-600 group-hover:underline">
                <span className="inline-flex items-center gap-2">
                  {bucket.name}
                  {bucket.pending ? <Badge className="text-xs">Pending</Badge> : null}
                </span>
              </TableCell>
              <TableCell>{bucket.object_count.toLocaleString()}</TableCell>
              <TableCell>{formatBytes(bucket.original_bytes)}</TableCell>
              <TableCell>{formatBytes(bucket.stored_bytes)}</TableCell>
              <TableCell>{renderSavings(bucket)}</TableCell>
              <TableCell
                className="text-right"
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
                      const confirmed = window.confirm(`Delete bucket “${bucket.name}”? This cannot be undone.`);
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
