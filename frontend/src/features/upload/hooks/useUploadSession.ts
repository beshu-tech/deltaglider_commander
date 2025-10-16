import { useState, useCallback } from "react";
import { SessionStats } from "../types";

export function useUploadSession() {
  const [stats, setStats] = useState<SessionStats>({
    count: 0,
    original: 0,
    stored: 0,
    savings: 0,
  });

  const updateStats = useCallback((newStats: SessionStats) => {
    setStats((prev) => ({
      count: prev.count + newStats.count,
      original: prev.original + newStats.original,
      stored: prev.stored + newStats.stored,
      savings: prev.savings + newStats.savings,
    }));
  }, []);

  const savingsPct = stats.original ? (stats.savings / stats.original) * 100 : 0;

  return {
    stats,
    savingsPct,
    updateStats,
  };
}
