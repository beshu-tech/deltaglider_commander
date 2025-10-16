import { AlertTriangle } from "lucide-react";
import { formatBytes } from "../../../lib/utils/bytes";
import { SavingsData } from "../hooks/useSavingsCalculation";

interface StorageStatsCardProps {
  savings: SavingsData;
  originalBytes: number;
  storedBytes: number;
  compressed: boolean;
}

export function StorageStatsCard({
  savings,
  originalBytes,
  storedBytes,
  compressed,
}: StorageStatsCardProps) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-ui-text-muted dark:text-ui-text-subtle">
        Storage stats
      </h3>
      <div className="rounded-lg border border-ui-border bg-gradient-to-br from-ui-bg-subtle to-ui-surface-active p-3 dark:border-ui-border-dark dark:from-ui-surface-active-dark dark:to-ui-surface-dark">
        {/* Main savings highlight */}
        <div className="mb-3 text-center">
          <div className="mb-1 inline-flex items-center justify-center gap-1 text-xs font-semibold uppercase tracking-wide text-ui-text-muted dark:text-ui-text-subtle">
            {savings.isGrowth ? (
              <>
                <AlertTriangle
                  className="h-3 w-3 text-primary-600 dark:text-primary-400"
                  aria-hidden="true"
                />
                Growth
              </>
            ) : (
              "Savings"
            )}
          </div>
          <div
            className={`text-3xl font-bold ${
              savings.isGrowth
                ? "text-rose-600 dark:text-rose-300"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {savings.pct.toFixed(1)}%
          </div>
          <div className="text-xs text-ui-text-muted dark:text-ui-text-subtle">
            {formatBytes(savings.bytes)} {savings.isGrowth ? "growth" : "saved"}
          </div>
        </div>

        {savings.isGrowth && (
          <div className="mb-2 flex items-start gap-2 rounded-md border border-primary-300 bg-primary-50 p-2 text-left text-xs text-primary-900 dark:border-primary-900 dark:bg-primary-950 dark:text-primary-100">
            <AlertTriangle
              className="mt-0.5 h-3 w-3 flex-shrink-0 text-primary-600 dark:text-primary-400"
              aria-hidden="true"
            />
            <div className="space-y-0.5">
              <p className="font-semibold">Delta increased this object</p>
              <p className="text-xs">
                The stored delta ({formatBytes(storedBytes)}) is larger than the original (
                {formatBytes(originalBytes)}). Re-upload without delta compression or refresh the
                reference to restore savings.
              </p>
            </div>
          </div>
        )}

        {/* Compact stats grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between rounded bg-white/50 px-2 py-1 dark:bg-ui-surface-active-dark/50">
            <span className="text-ui-text-muted dark:text-ui-text-subtle">Original</span>
            <span className="font-semibold text-ui-text dark:text-ui-text-dark">
              {formatBytes(originalBytes)}
            </span>
          </div>
          <div className="flex items-center justify-between rounded bg-white/50 px-2 py-1 dark:bg-ui-surface-active-dark/50">
            <span className="text-ui-text-muted dark:text-ui-text-subtle">Stored</span>
            <span className="font-semibold text-ui-text dark:text-ui-text-dark">
              {formatBytes(storedBytes)}
            </span>
          </div>
        </div>

        {/* Compression status */}
        <div className="mt-1 text-center">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              compressed
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                : "bg-ui-surface-active text-ui-text dark:bg-ui-surface-active-dark dark:text-ui-text-muted-dark"
            }`}
          >
            {compressed ? "Compressed" : "Original"}
          </span>
        </div>
      </div>
    </section>
  );
}
