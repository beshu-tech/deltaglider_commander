import { useEffect, useRef } from "react";
import { BucketsPanel } from "../features/buckets/BucketsPanel";
import { useStats } from "../features/stats/useStats";
import { formatBytes } from "../lib/utils/bytes";

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
              <h1 ref={headingRef} tabIndex={-1} className="text-4xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
                Object Storage Console
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300 max-w-3xl">
                Powered by{' '}
                <a 
                  href="https://pypi.org/project/deltaglider/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  DeltaGlider
                </a>'s advanced compression engine based on{' '}
                <a 
                  href="https://github.com/jmacd/xdelta" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  xdelta3
                </a>{' '}
                binary diff
              </p>
            </div>

            {/* Live Stats Dashboard */}
            {summary ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Buckets Stat */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Buckets</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                    {summary.bucketCount}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {summary.pendingCount > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                        {summary.pendingCount} pending
                      </span>
                    ) : (
                      'All active'
                    )}
                  </p>
                </div>

                {/* Objects Stat */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 12h10m-7 5h4" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Objects</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                    {summary.objectCount.toLocaleString()}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {formatBytes(summary.storedBytes)} stored
                  </p>
                </div>

                {/* Compression Ratio */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4a2 2 0 012-2h8a2 2 0 012 2v4M4 8h16M4 8v8a2 2 0 002 2h12a2 2 0 002-2V8" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Ratio</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                    {(summary.originalBytes / summary.storedBytes).toFixed(1)}:1
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    compression
                  </p>
                </div>

                {/* Total Savings */}
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-md">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400">Saved</span>
                  </div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                    {summary.savingsPct.toFixed(1)}%
                  </div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    {formatBytes(summary.originalBytes - summary.storedBytes)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">No storage data available</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Connect to your S3-compatible storage to view metrics</p>
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
