import { ReactNode, useEffect, useRef, useState } from "react";
import { StatsSummary } from "./useStats";
import { formatBytesThin } from "../../lib/utils/bytes";

type Tone = "primary" | "secondary";

interface StatCardConfig {
  id: string;
  label: string;
  tone: Tone;
  icon: ReactNode;
  value: ReactNode;
  description: ReactNode;
  subMetric?: ReactNode;
  sideMetric?: ReactNode;
}

interface StatCardProps extends StatCardConfig {
  fillProgress: number;
  assistiveText: string;
  isAnalyzing: boolean;
  isSavings?: boolean;
  animateSavings?: boolean;
}

// Water fill opacity is controlled via CSS opacity on the gradient elements
// We'll use Tailwind's opacity modifiers for this

const tonePalette: Record<
  Tone,
  {
    cardClass: string;
    iconClass: string;
    iconShadowClass: string;
    airGradientClass: string;
    waterGradientClass: string;
    glossGradientClass: string;
  }
> = {
  primary: {
    cardClass:
      "border border-primary-900/15 bg-white/60 text-ui-text shadow-elevation-sm dark:border-primary-900/20 dark:bg-ui-bg-dark/72 dark:text-ui-text-dark dark:shadow-elevation-sm-dark",
    iconClass: "bg-gradient-to-br from-purple-400 to-purple-500 shadow-icon-purple",
    iconShadowClass: "shadow-icon-purple",
    airGradientClass: "bg-air-light dark:bg-air-dark",
    waterGradientClass: "bg-water-light dark:bg-water-dark",
    glossGradientClass: "bg-gloss-primary-light dark:bg-gloss-primary-dark",
  },
  secondary: {
    cardClass:
      "border border-primary-900/15 bg-white/60 text-ui-text shadow-elevation-sm dark:border-primary-900/20 dark:bg-ui-bg-dark/78 dark:text-ui-text-dark dark:shadow-elevation-sm-dark",
    iconClass: "bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-icon-emerald",
    iconShadowClass: "shadow-icon-emerald",
    airGradientClass: "bg-air-light dark:bg-air-dark",
    waterGradientClass: "bg-water-light dark:bg-water-dark",
    glossGradientClass: "bg-gloss-secondary-light dark:bg-gloss-secondary-dark",
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
  subMetric,
  sideMetric,
  fillProgress,
  assistiveText,
  isAnalyzing,
  isSavings = false,
  animateSavings = false,
}: StatCardProps) {
  const palette = tonePalette[tone];

  const animatedFill = useAnimatedNumber(clampProgress(fillProgress), {
    precision: 3,
    minDuration: 700,
    maxDuration: 1800,
  });

  const baseProgress = clampProgress(animatedFill);
  const effectiveProgress = baseProgress > 0 ? baseProgress : isAnalyzing ? 0.12 : 0;
  const savingsActive = isSavings && animateSavings;

  console.log(`[StatCard ${label}]`, {
    fillProgress,
    animatedFill,
    effectiveProgress,
    "effectiveProgress%": `${(effectiveProgress * 100).toFixed(1)}%`,
  });

  return (
    <article
      className={joinClasses(
        "group relative overflow-hidden rounded-2xl px-4 py-4 transition-shadow duration-500 hover:shadow-elevation-md motion-reduce:transition-none sm:px-6 sm:py-6",
        palette.cardClass,
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 opacity-95 transition-opacity duration-500">
          <div
            className={joinClasses(
              "absolute inset-0 rounded-b-2xl",
              palette.airGradientClass
            )}
          />
        </div>
        <div className="absolute inset-0 flex flex-col justify-end">
          <div
            className="relative w-full origin-bottom transition-[height] duration-700 ease-out"
            style={{ height: `${effectiveProgress * 100}%` }}
          >
            <div className="absolute inset-0 overflow-hidden rounded-b-2xl">
              <div
                className={joinClasses(
                  "absolute inset-0 rounded-b-2xl",
                  palette.waterGradientClass,
                  savingsActive ? "animate-savings-wave" : "",
                )}
              />
              <div
                className={joinClasses(
                  "absolute inset-x-0 top-0 h-8 transition-opacity duration-500",
                  palette.glossGradientClass,
                  effectiveProgress > 0 ? "opacity-80 dark:opacity-70" : "opacity-0",
                )}
              />
            </div>
            <div
              className={joinClasses(
                "absolute inset-x-0 -top-[1px] h-[2px] bg-water-line transition-opacity duration-500",
                effectiveProgress > 0 ? "opacity-90" : "opacity-0",
              )}
            />
          </div>
        </div>
        <div className="absolute inset-0 rounded-2xl border border-white/25 mix-blend-overlay opacity-40 dark:border-white/10" />
      </div>
      <div className="relative z-10 flex items-start gap-4">
        <div
          className={joinClasses(
            "flex h-12 w-12 items-center justify-center rounded-xl text-white transition-all duration-700 ease-out motion-reduce:transition-none",
            palette.iconClass,
          )}
          style={{
            transform: `translateY(${effectiveProgress * -2}px)`,
            opacity: 0.9 + effectiveProgress * 0.1,
          }}
          aria-hidden="true"
        >
          {icon}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3">
            <span className="text-left text-[1.45rem] font-semibold uppercase tracking-[0.18em] text-ui-text/90 drop-shadow-text-light dark:text-ui-text-dark dark:drop-shadow-text-dark">
              {label}
            </span>
            {sideMetric && <div className="flex flex-col items-end">{sideMetric}</div>}
          </div>
          <div className="mt-3 text-left text-[2.2rem] font-semibold leading-tight tracking-tight text-ui-text tabular-nums drop-shadow-value-light dark:text-white dark:drop-shadow-value-dark md:text-[2.5rem]">
            {value}
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-left text-base font-normal leading-snug text-ui-text-muted tabular-nums dark:text-ui-text-dark/90">
              {description}
            </p>
            {subMetric && <div className="flex flex-col items-end text-right">{subMetric}</div>}
          </div>
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
  const hasActiveBuckets = activeBucketCount > 0;
  const hasAnalyzingBuckets = summary.analyzingCount > 0;
  const [animateSavings, setAnimateSavings] = useState(false);

  useEffect(() => {
    setAnimateSavings(true);
    const timeout = window.setTimeout(() => setAnimateSavings(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [summary.savingsPct, summary.storedBytes, summary.originalBytes]);

  // Animate the analysis coverage progress (0.0 to 1.0)
  const animatedProgress = useAnimatedNumber(clampProgress(summary.analysisCoverage), {
    precision: 3,
    minDuration: 800,
    maxDuration: 2200,
  });

  console.log("[StatsOverviewCards] Raw values:", {
    analysisCoverage: summary.analysisCoverage,
    animatedProgress,
    savingsPct: summary.savingsPct,
    objectCount: summary.objectCount,
  });

  const assistiveText = hasActiveBuckets
    ? `${summary.analyzedBucketCount} of ${activeBucketCount} active ${pluralize(activeBucketCount, "bucket")} analyzed. ${summary.analyzingCount} ${pluralize(summary.analyzingCount, "bucket")} still in progress.`
    : summary.pendingCount > 0
      ? `${summary.pendingCount} ${pluralize(summary.pendingCount, "bucket")} pending analysis.`
      : "No active buckets available for analysis yet.";

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

  // Animate the savings percentage for water fill (0.0 to 1.0)
  const animatedSavingsFillProgress = useAnimatedNumber(
    clampProgress(Math.max(0, summary.savingsPct) / 100),
    {
      precision: 3,
      minDuration: 900,
      maxDuration: 2200,
    },
  );

  console.log("[StatsOverviewCards] Animated values:", {
    animatedSavingsPct,
    animatedSavingsFillProgress,
    animatedObjectCount,
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

  const cards: StatCardConfig[] = [
    {
      id: "objects",
      label: "Objects",
      tone: "primary",
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
      description: `${formatBytesThin(Math.max(0, Math.round(animatedStoredBytes)))} stored in ${animatedBucketCount.toLocaleString()} ${pluralize(summary.bucketCount, "bucket")}`,
    },
    {
      id: "compression",
      label: "Compression",
      tone: "secondary",
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
      description: `${formatBytesThin(Math.max(0, Math.round(savedBytes)))} saved (${ratioValue} ratio)`,
    },
  ];

  console.log("[StatsOverviewCards] fillProgress values:", {
    compression: animatedSavingsFillProgress,
    objects: animatedProgress,
  });

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
      {cards.map((card) => (
        <StatCard
          key={card.id}
          {...card}
          fillProgress={card.id === "compression" ? animatedSavingsFillProgress : animatedProgress}
          assistiveText={assistiveText}
          isAnalyzing={hasAnalyzingBuckets}
          isSavings={card.id === "compression"}
          animateSavings={card.id === "compression" ? animateSavings : false}
        />
      ))}
    </div>
  );
}
