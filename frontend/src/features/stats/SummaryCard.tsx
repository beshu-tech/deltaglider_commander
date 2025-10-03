import { formatBytes } from "../../lib/utils/bytes";
import { StatsSummary } from "./useStats";

export function SummaryCard({ summary }: { summary: StatsSummary | null }) {
  if (!summary) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        No data available.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3">
      <div>
        <div className="text-xs uppercase text-slate-500">Buckets</div>
        <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {summary.bucketCount}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {summary.pendingCount} pending jobs
        </p>
      </div>
      <div>
        <div className="text-xs uppercase text-slate-500">Objects</div>
        <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {summary.objectCount}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {formatBytes(summary.storedBytes)} stored
        </p>
      </div>
      <div>
        <div className="text-xs uppercase text-slate-500">Savings</div>
        <div className="text-2xl font-semibold text-emerald-500">
          {summary.savingsPct.toFixed(1)}%
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {formatBytes(summary.originalBytes - summary.storedBytes)} saved
        </p>
      </div>
    </div>
  );
}
