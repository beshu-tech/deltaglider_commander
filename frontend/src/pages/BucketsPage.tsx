import { BucketsPanel } from "../features/buckets/BucketsPanel";
import { useStats } from "../features/stats/useStats";
import { StatsOverviewCards } from "../features/stats/StatsOverviewCards";

export function BucketsPage() {
  const { summary } = useStats();

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      {/* Unified Hero Section with Stats */}
      <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-850 border-b border-slate-200 dark:border-slate-800">
        <div className="px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-7xl">
            {/* Header Section */}
            <div className="mb-8 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="h-1 w-12 rounded-full bg-gradient-to-r from-red-500 to-red-600 sm:w-16"></div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 sm:text-sm">
                  Smart Object Storage Platform
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white/90 sm:text-4xl">
                Object Storage Console
              </h1>
              <p className="max-w-3xl text-base text-slate-600 dark:text-white/70 sm:text-lg">
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
              <StatsOverviewCards summary={summary} />
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
      <div className="px-4 py-6 sm:px-8 sm:py-8">
        <BucketsPanel />
      </div>
    </div>
  );
}
