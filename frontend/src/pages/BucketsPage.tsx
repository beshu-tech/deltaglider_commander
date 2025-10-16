import { BucketsPanel } from "../features/buckets/BucketsPanel";
import { useStats } from "../features/stats/useStats";
import { StatsOverviewCards } from "../features/stats/StatsOverviewCards";

export function BucketsPage() {
  const { summary } = useStats();

  return (
    <div className="flex flex-1 flex-col overflow-auto">
      {/* Unified Hero Section with Stats */}
      <div className="bg-gradient-to-br from-ui-bg-subtle to-ui-surface dark:from-ui-bg-dark dark:to-ui-bg-subtle-dark border-b border-ui-border dark:border-ui-border-dark">
        <div className="px-4 pt-6 pb-8 sm:px-8 sm:pt-8 sm:pb-10">
          <div className="mx-auto max-w-7xl space-y-10">
            {/* Header Section */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="h-1 w-12 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 sm:w-16"></div>
                <span className="text-xs font-semibold uppercase tracking-wider text-ui-text-muted dark:text-ui-text-muted-dark sm:text-sm">
                  Smart Object Storage Platform
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-ui-text dark:text-ui-text-dark sm:text-4xl">
                Object Storage Console
              </h1>
              <p className="max-w-3xl text-base text-ui-text-muted dark:text-ui-text-muted-dark sm:text-lg">
                Powered by{" "}
                <a
                  href="https://pypi.org/project/deltaglider/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary-600 dark:text-primary-500 hover:underline"
                >
                  DeltaGlider
                </a>
                's advanced compression engine based on{" "}
                <a
                  href="https://github.com/jmacd/xdelta"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 dark:text-primary-500 hover:underline font-medium"
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
              <div className="bg-ui-surface dark:bg-ui-surface-dark rounded-xl p-8 border border-ui-border dark:border-ui-border-dark shadow-sm">
                <div className="flex items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-ui-surface-active dark:bg-ui-surface-hover-dark flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-ui-icon dark:text-ui-icon-dark"
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
                    <p className="font-semibold text-ui-text dark:text-ui-text-dark">
                      No storage data available
                    </p>
                    <p className="text-sm text-ui-text-muted dark:text-ui-text-muted-dark">
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
      <div className="mt-12 px-4 py-6 sm:px-8 sm:py-8">
        <BucketsPanel />
      </div>
    </div>
  );
}
