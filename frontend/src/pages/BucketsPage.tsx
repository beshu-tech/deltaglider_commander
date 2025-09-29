import { useEffect, useRef } from "react";
import { BucketsPanel } from "../features/buckets/BucketsPanel";
import { SummaryCard } from "../features/stats/SummaryCard";
import { useStats } from "../features/stats/useStats";

export function BucketsPage() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { summary } = useStats();

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-auto p-6">
      <div>
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold">
          Buckets
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Browse DeltaGlider buckets and trigger savings computations.
        </p>
      </div>
      <SummaryCard summary={summary} />
      <BucketsPanel />
    </div>
  );
}
