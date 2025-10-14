import { ReactNode, useEffect, useRef } from "react";
import { BucketsPanel } from "../features/buckets/BucketsPanel";
import { useStats } from "../features/stats/useStats";
import { formatBytes } from "../lib/utils/bytes";

type StatCardProps = {
  label: string;
  labelClassName?: string;
  value: ReactNode;
  valueClassName?: string;
  description: ReactNode;
  descriptionClassName?: string;
  icon: ReactNode;
  iconWrapperClassName: string;
  containerClassName?: string;
};

function joinClasses(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

function StatCard({
  label,
  labelClassName,
  value,
  valueClassName,
  description,
  descriptionClassName,
  icon,
  iconWrapperClassName,
  containerClassName,
}: StatCardProps) {
  return (
    <div
      className={joinClasses(
        "rounded-xl p-6 border shadow-elevation-sm dark:shadow-elevation-sm-dark",
        containerClassName,
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={joinClasses("flex h-11 w-11 items-center justify-center rounded-lg", iconWrapperClassName)}>
          {icon}
        </div>
        <span
          className={joinClasses(
            "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400",
            labelClassName,
          )}
        >
          {label}
        </span>
      </div>
      <div className={joinClasses("text-3xl font-bold text-slate-900 dark:text-white/90 mb-2", valueClassName)}>
        {value}
      </div>
      <p className={joinClasses("text-sm font-medium text-slate-600 dark:text-white/70", descriptionClassName)}>
        {description}
      </p>
    </div>
  );
}

export function BucketsPage() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { summary } = useStats();

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      {/* Unified Hero Section with Stats */}
      <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-850 border-b border-slate-200 dark:border-slate-800">
        <div className="px-8 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-1 w-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full"></div>
                <span className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Smart Object Storage Platform
                </span>
              </div>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="text-4xl font-bold text-slate-900 dark:text-white/90 mb-3 tracking-tight"
              >
                Object Storage Console
              </h1>
              <p className="text-lg text-slate-600 dark:text-white/70 max-w-3xl">
                Powered by{" "}
                <a
                  href="https://pypi.org/project/deltaglider/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  DeltaGlider
                </a>
                's advanced compression engine based on{" "}
                <a
                  href="https://github.com/jmacd/xdelta"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  xdelta3
                </a>{" "}
                binary diff
              </p>
            </div>

            {/* Live Stats Dashboard */}
            {summary ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Buckets Stat */}
                <StatCard
                  label="Buckets"
                  iconWrapperClassName="bg-blue-100 dark:bg-blue-900/50"
                  icon={
                    <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                      />
                    </svg>
                  }
                  value={summary.bucketCount}
                  description={
                    summary.pendingCount > 0 ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500"></span>
                        {summary.pendingCount} pending
                      </span>
                    ) : (
                      "All active"
                    )
                  }
                  containerClassName="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />

                <StatCard
                  label="Objects"
                  iconWrapperClassName="bg-purple-100 dark:bg-purple-900/50"
                  icon={
                    <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 12h10m-7 5h4" />
                    </svg>
                  }
                  value={summary.objectCount.toLocaleString()}
                  description={`${formatBytes(summary.storedBytes)} stored`}
                  containerClassName="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />

                <StatCard
                  label="Ratio"
                  iconWrapperClassName="bg-amber-100 dark:bg-amber-900/50"
                  icon={
                    <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 8V4a2 2 0 012-2h8a2 2 0 012 2v4M4 8h16M4 8v8a2 2 0 002 2h12a2 2 0 002-2V8"
                      />
                    </svg>
                  }
                  value={
                    summary.originalBytes === 0 || summary.storedBytes === 0
                      ? "N/A"
                      : `${(summary.originalBytes / summary.storedBytes).toFixed(1)}:1`
                  }
                  description="compression"
                  containerClassName="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />

                <StatCard
                  label="Saved"
                  labelClassName="text-emerald-700 dark:text-emerald-400"
                  iconWrapperClassName="bg-gradient-to-br from-emerald-500 to-green-600 shadow-md"
                  icon={
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  }
                  value={`${summary.savingsPct.toFixed(1)}%`}
                  valueClassName="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2"
                  description={formatBytes(summary.originalBytes - summary.storedBytes)}
                  descriptionClassName="text-sm font-semibold text-emerald-700 dark:text-emerald-300"
                  containerClassName="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 border-emerald-200 dark:border-emerald-800 shadow-elevation-md dark:shadow-elevation-md-dark"
                />
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      No storage data available
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Connect to your S3-compatible storage to view metrics
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-8 py-8">
        <BucketsPanel />
      </div>
    </div>
  );
}
