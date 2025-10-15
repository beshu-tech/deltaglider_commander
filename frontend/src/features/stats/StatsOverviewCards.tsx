import { ReactNode, useEffect, useRef, useState } from "react";
import { StatsSummary } from "./useStats";
import { formatBytes } from "../../lib/utils/bytes";

type Tone = "blue" | "purple" | "amber" | "emerald";

interface StatCardConfig {
  id: string;
  label: string;
  tone: Tone;
  icon: ReactNode;
  value: ReactNode;
  description: ReactNode;
}

interface StatCardProps extends StatCardConfig {
  progress: number;
  assistiveText: string;
  isAnalyzing: boolean;
}

const tonePalette: Record<
  Tone,
  {
    cardClass: string;
    iconClass: string;
    iconShadow: string;
    air: { lightTop: string; lightBottom: string; darkTop: string; darkBottom: string };
    water: { lightTop: string; lightBottom: string; darkTop: string; darkBottom: string };
    gloss: { light: string; dark: string };
  }
> = {
  blue: {
    cardClass:
      "border border-blue-500/15 bg-white/60 text-slate-900 shadow-elevation-sm dark:border-blue-500/20 dark:bg-slate-950/72 dark:text-slate-100 dark:shadow-elevation-sm-dark",
    iconClass: "bg-gradient-to-br from-blue-500 to-blue-600",
    iconShadow: "0 18px 44px rgba(59, 130, 246, 0.35)",
    air: {
      lightTop: "rgba(248, 251, 255, 0.55)",
      lightBottom: "rgba(226, 232, 240, 0.35)",
      darkTop: "rgba(11, 17, 32, 0.5)",
      darkBottom: "rgba(23, 35, 63, 0.32)",
    },
    water: {
      lightTop: "rgba(96, 165, 250, 0.7)",
      lightBottom: "rgba(29, 78, 216, 0.55)",
      darkTop: "rgba(37, 99, 235, 0.6)",
      darkBottom: "rgba(15, 63, 150, 0.5)",
    },
    gloss: {
      light:
        "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0) 100%)",
      dark: "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.07) 55%, rgba(255,255,255,0) 100%)",
    },
  },
  purple: {
    cardClass:
      "border border-purple-500/15 bg-white/60 text-slate-900 shadow-elevation-sm dark:border-purple-500/20 dark:bg-slate-950/78 dark:text-slate-100 dark:shadow-elevation-sm-dark",
    iconClass: "bg-gradient-to-br from-purple-500 to-purple-600",
    iconShadow: "0 18px 44px rgba(147, 51, 234, 0.35)",
    air: {
      lightTop: "rgba(250, 245, 255, 0.55)",
      lightBottom: "rgba(233, 213, 255, 0.38)",
      darkTop: "rgba(26, 16, 40, 0.5)",
      darkBottom: "rgba(37, 17, 52, 0.32)",
    },
    water: {
      lightTop: "rgba(192, 132, 252, 0.7)",
      lightBottom: "rgba(124, 58, 237, 0.55)",
      darkTop: "rgba(139, 92, 246, 0.6)",
      darkBottom: "rgba(91, 33, 182, 0.5)",
    },
    gloss: {
      light:
        "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0) 100%)",
      dark: "linear-gradient(180deg, rgba(255,255,255,0.21) 0%, rgba(255,255,255,0.08) 55%, rgba(255,255,255,0) 100%)",
    },
  },
  amber: {
    cardClass:
      "border border-amber-500/15 bg-white/65 text-slate-900 shadow-elevation-sm dark:border-amber-500/20 dark:bg-slate-950/78 dark:text-slate-100 dark:shadow-elevation-sm-dark",
    iconClass: "bg-gradient-to-br from-amber-400 to-amber-500",
    iconShadow: "0 18px 44px rgba(217, 119, 6, 0.32)",
    air: {
      lightTop: "rgba(255, 247, 237, 0.55)",
      lightBottom: "rgba(253, 230, 138, 0.37)",
      darkTop: "rgba(33, 19, 6, 0.48)",
      darkBottom: "rgba(44, 26, 12, 0.3)",
    },
    water: {
      lightTop: "rgba(251, 191, 36, 0.7)",
      lightBottom: "rgba(217, 119, 6, 0.55)",
      darkTop: "rgba(234, 138, 26, 0.62)",
      darkBottom: "rgba(180, 83, 9, 0.5)",
    },
    gloss: {
      light:
        "linear-gradient(180deg, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.1) 55%, rgba(255,255,255,0) 100%)",
      dark: "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.07) 55%, rgba(255,255,255,0) 100%)",
    },
  },
  emerald: {
    cardClass:
      "border border-emerald-500/15 bg-white/60 text-slate-900 shadow-elevation-sm dark:border-emerald-500/20 dark:bg-slate-950/78 dark:text-slate-100 dark:shadow-elevation-sm-dark",
    iconClass: "bg-gradient-to-br from-emerald-500 to-green-600",
    iconShadow: "0 18px 44px rgba(16, 185, 129, 0.35)",
    air: {
      lightTop: "rgba(240, 253, 244, 0.55)",
      lightBottom: "rgba(187, 247, 208, 0.38)",
      darkTop: "rgba(15, 31, 26, 0.48)",
      darkBottom: "rgba(19, 41, 35, 0.3)",
    },
    water: {
      lightTop: "rgba(52, 211, 153, 0.7)",
      lightBottom: "rgba(4, 120, 87, 0.55)",
      darkTop: "rgba(15, 157, 104, 0.62)",
      darkBottom: "rgba(6, 95, 70, 0.5)",
    },
    gloss: {
      light:
        "linear-gradient(180deg, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.1) 55%, rgba(255,255,255,0) 100%)",
      dark: "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.07) 55%, rgba(255,255,255,0) 100%)",
    },
  },
};

function joinClasses(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

function pluralize(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

function clampProgress(progress: number | undefined) {
  if (progress === undefined || Number.isNaN(progress)) {
    return 0;
  }
  return Math.min(Math.max(progress, 0), 1);
}

interface AnimatedNumberOptions {
  precision?: number;
  minDuration?: number;
  maxDuration?: number;
}

function useAnimatedNumber(target: number, options?: AnimatedNumberOptions) {
  const { precision = 0, minDuration = 800, maxDuration = 2200 } = options ?? {};
  const roundValue = (value: number) => {
    if (!Number.isFinite(value)) {
      return value;
    }
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
  };

  const initial = Number.isFinite(target) ? roundValue(target) : target;
  const [display, setDisplay] = useState(initial);
  const startValueRef = useRef(initial);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const roundValue = (value: number) => {
      if (!Number.isFinite(value)) {
        return value;
      }
      const factor = Math.pow(10, precision);
      return Math.round(value * factor) / factor;
    };

    if (!Number.isFinite(target)) {
      setDisplay(target);
      startValueRef.current = target;
      return () => {
        if (frameRef.current !== null) {
          cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
      };
    }

    const toValue = roundValue(target);
    const fromValue = startValueRef.current;

    if (toValue === fromValue) {
      return () => {
        if (frameRef.current !== null) {
          cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
      };
    }

    const duration = Math.random() * (maxDuration - minDuration) + minDuration;
    const startTime = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = fromValue + (toValue - fromValue) * eased;
      const rounded = roundValue(next);
      setDisplay(rounded);
      startValueRef.current = rounded;

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        frameRef.current = null;
      }
    };

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }
    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [target, precision, minDuration, maxDuration]);

  return display;
}

function StatCard({
  label,
  tone,
  icon,
  value,
  description,
  progress,
  assistiveText,
  isAnalyzing,
}: StatCardProps) {
  const palette = tonePalette[tone];
  const effectiveProgress = progress > 0 ? progress : isAnalyzing ? 0.12 : 0;

  return (
    <article
      className={joinClasses(
        "group relative overflow-hidden rounded-2xl px-6 py-6 transition-shadow duration-500 hover:shadow-elevation-md motion-reduce:transition-none",
        palette.cardClass,
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 opacity-95 transition-opacity duration-500">
          <div
            className="absolute inset-0 rounded-b-2xl dark:hidden"
            style={{
              backgroundImage: `linear-gradient(180deg, ${palette.air.lightTop} 0%, ${palette.air.lightBottom} 100%)`,
            }}
          />
          <div
            className="absolute inset-0 hidden rounded-b-2xl dark:block"
            style={{
              backgroundImage: `linear-gradient(180deg, ${palette.air.darkTop} 0%, ${palette.air.darkBottom} 100%)`,
            }}
          />
        </div>
        <div className="absolute inset-0 flex flex-col justify-end">
          <div
            className="relative w-full origin-bottom transition-[height] duration-700 ease-out"
            style={{ height: `${effectiveProgress * 100}%` }}
          >
            <div className="absolute inset-0 overflow-hidden rounded-b-2xl">
              <div
                className="absolute inset-0 rounded-b-2xl dark:hidden"
                style={{
                  backgroundImage: `linear-gradient(180deg, ${palette.water.lightTop} 0%, ${palette.water.lightBottom} 100%)`,
                }}
              />
              <div
                className="absolute inset-0 hidden rounded-b-2xl dark:block"
                style={{
                  backgroundImage: `linear-gradient(180deg, ${palette.water.darkTop} 0%, ${palette.water.darkBottom} 100%)`,
                }}
              />
              <div
                className={joinClasses(
                  "absolute inset-x-0 top-0 h-8 opacity-0 transition-opacity duration-500 dark:hidden",
                  effectiveProgress > 0 ? "opacity-80" : "opacity-0",
                )}
                style={{ backgroundImage: palette.gloss.light }}
              />
              <div
                className={joinClasses(
                  "absolute inset-x-0 top-0 hidden h-8 opacity-0 transition-opacity duration-500 dark:block",
                  effectiveProgress > 0 ? "opacity-70" : "opacity-0",
                )}
                style={{ backgroundImage: palette.gloss.dark }}
              />
            </div>
            <div
              className={joinClasses(
                "absolute inset-x-0 -top-[1px] h-[2px] opacity-0 transition-opacity duration-500",
                effectiveProgress > 0 ? "opacity-90" : "opacity-0",
              )}
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0.75) 100%)",
              }}
            />
          </div>
        </div>
        <div className="absolute inset-0 rounded-2xl border border-white/25 mix-blend-overlay opacity-40 dark:border-white/10" />
      </div>
      <div className="relative z-10 flex items-start gap-4">
        <div
          className={joinClasses(
            "flex h-12 w-12 items-center justify-center rounded-xl text-white transition-transform duration-700 ease-out motion-reduce:transition-none",
            palette.iconClass,
          )}
          style={{
            boxShadow: palette.iconShadow,
            transform: `translateY(${effectiveProgress * -2}px)`,
            opacity: 0.9 + effectiveProgress * 0.1,
          }}
          aria-hidden="true"
        >
          {icon}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[1.8rem] font-semibold uppercase tracking-[0.24em] text-slate-700 drop-shadow-[0_1px_2px_rgba(255,255,255,0.55)] dark:text-slate-200 dark:drop-shadow-[0_1px_4px_rgba(8,15,35,0.55)]">
            {label}
          </span>
          <div className="mt-3 text-[2.3rem] font-semibold leading-tight tracking-tight text-slate-900 drop-shadow-[0_4px_12px_rgba(15,23,42,0.25)] dark:text-white dark:drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)] md:text-[2.6rem]">
            {value}
          </div>
          <p className="mt-2 text-base font-medium leading-snug text-slate-700 drop-shadow-[0_1px_3px_rgba(15,23,42,0.3)] dark:text-slate-200 dark:drop-shadow-[0_1px_4px_rgba(2,6,23,0.45)]">
            {description}
          </p>
        </div>
      </div>
      <span className="sr-only" aria-live="polite">
        {assistiveText}
      </span>
    </article>
  );
}

export function StatsOverviewCards({ summary }: { summary: StatsSummary }) {
  const { activeBucketCount } = summary;
  const progress = clampProgress(summary.analysisCoverage);
  const hasActiveBuckets = activeBucketCount > 0;
  const hasAnalyzingBuckets = summary.analyzingCount > 0;

  const assistiveText = hasActiveBuckets
    ? `${summary.analyzedBucketCount} of ${activeBucketCount} active ${pluralize(activeBucketCount, "bucket")} analyzed. ${summary.analyzingCount} ${pluralize(summary.analyzingCount, "bucket")} still in progress.`
    : summary.pendingCount > 0
      ? `${summary.pendingCount} ${pluralize(summary.pendingCount, "bucket")} pending analysis.`
      : "No active buckets available for analysis yet.";

  const bucketDescription =
    summary.pendingCount > 0
      ? `${summary.pendingCount} pending ${pluralize(summary.pendingCount, "bucket")}`
      : summary.bucketCount === 0
        ? "No buckets yet"
        : "All buckets active";

  const animatedBucketCount = useAnimatedNumber(summary.bucketCount, {
    precision: 0,
    minDuration: 600,
    maxDuration: 1400,
  });

  const animatedObjectCount = useAnimatedNumber(summary.objectCount, {
    precision: 0,
    minDuration: 800,
    maxDuration: 2200,
  });

  const animatedStoredBytes = useAnimatedNumber(summary.storedBytes, {
    precision: 0,
    minDuration: 800,
    maxDuration: 2200,
  });

  const animatedOriginalBytes = useAnimatedNumber(summary.originalBytes, {
    precision: 0,
    minDuration: 800,
    maxDuration: 2200,
  });

  const savingsPctTarget = Math.max(0, summary.savingsPct);
  const animatedSavingsPct = useAnimatedNumber(savingsPctTarget, {
    precision: 1,
    minDuration: 900,
    maxDuration: 2200,
  });

  const savedBytes = Math.max(0, animatedOriginalBytes - animatedStoredBytes);

  const ratioRef = useRef<number | null>(null);
  const nextRatio = summary.storedBytes > 0 ? summary.originalBytes / summary.storedBytes : null;
  if (Number.isFinite(nextRatio) && nextRatio && nextRatio > 0) {
    ratioRef.current = nextRatio;
  }
  const hasRatio = ratioRef.current !== null;
  const animatedRatio = useAnimatedNumber(ratioRef.current ?? 0, {
    precision: 1,
    minDuration: 900,
    maxDuration: 2200,
  });

  const ratioValue = hasRatio ? `${Math.max(animatedRatio, 0).toFixed(1)}:1` : "—";
  const ratioDescription = hasRatio
    ? "Compression ratio"
    : hasActiveBuckets
      ? "Waiting for compression data"
      : "No compression data";

  const cards: StatCardConfig[] = [
    {
      id: "buckets",
      label: "Buckets",
      tone: "blue",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
          />
        </svg>
      ),
      value: animatedBucketCount.toLocaleString(),
      description: bucketDescription,
    },
    {
      id: "objects",
      label: "Objects",
      tone: "purple",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 7h10M7 12h10m-7 5h4"
          />
        </svg>
      ),
      value: animatedObjectCount.toLocaleString(),
      description: `${formatBytes(Math.max(0, Math.round(animatedStoredBytes)))} stored`,
    },
    {
      id: "ratio",
      label: "Ratio",
      tone: "amber",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8V4a2 2 0 012-2h8a2 2 0 012 2v4M4 8h16M4 8v8a2 2 0 002 2h12a2 2 0 002-2V8"
          />
        </svg>
      ),
      value: ratioValue,
      description: ratioDescription,
    },
    {
      id: "savings",
      label: "Saved",
      tone: "emerald",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      value: `${Math.max(animatedSavingsPct, 0).toFixed(1)}%`,
      description: `${formatBytes(Math.max(0, Math.round(savedBytes)))} saved`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <StatCard
          key={card.id}
          {...card}
          progress={progress}
          assistiveText={assistiveText}
          isAnalyzing={hasAnalyzingBuckets}
        />
      ))}
    </div>
  );
}
