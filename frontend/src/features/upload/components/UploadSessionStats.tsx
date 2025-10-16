import { formatBytes } from "../../../lib/utils/bytes";
import { SessionStats } from "../types";

interface UploadSessionStatsProps {
  stats: SessionStats;
  savingsPct: number;
}

export function UploadSessionStats({ stats, savingsPct }: UploadSessionStatsProps) {
  return (
    <section className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100">
      <h2 className="text-sm font-semibold uppercase tracking-wide">Upload Session Statistics</h2>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
        <div>
          <p className="text-xs text-emerald-700 dark:text-emerald-300">Files uploaded</p>
          <p className="text-xl font-semibold">{stats.count}</p>
        </div>
        <div>
          <p className="text-xs text-emerald-700 dark:text-emerald-300">Original size</p>
          <p className="text-base font-medium">{formatBytes(stats.original)}</p>
        </div>
        <div>
          <p className="text-xs text-emerald-700 dark:text-emerald-300">Stored</p>
          <p className="text-base font-medium">{formatBytes(stats.stored)}</p>
        </div>
        <div>
          <p className="text-xs text-emerald-700 dark:text-emerald-300">Space saved</p>
          <p className="text-base font-medium">
            {formatBytes(stats.savings)} ({savingsPct.toFixed(1)}%)
          </p>
        </div>
      </div>
    </section>
  );
}
