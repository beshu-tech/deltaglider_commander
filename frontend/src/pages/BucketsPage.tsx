import { useEffect, useRef } from "react";
import { BucketsPanel } from "../features/buckets/BucketsPanel";
import { useStats } from "../features/stats/useStats";
import { StatsOverviewCards } from "../features/stats/StatsOverviewCards";

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
      <div className="px-8 py-8">
        <BucketsPanel />
      </div>
    </div>
  );
}
