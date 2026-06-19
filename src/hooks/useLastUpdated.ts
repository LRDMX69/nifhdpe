import { useEffect, useState } from "react";

/**
 * Returns a timestamp that updates whenever `signal` changes
 * (e.g. when a TanStack query's `dataUpdatedAt` increments).
 * Pair with PageHeader's `lastUpdated` prop.
 */
export const useLastUpdated = (signal: number | undefined | null): Date | null => {
  const [ts, setTs] = useState<Date | null>(signal ? new Date(signal) : null);
  useEffect(() => {
    if (signal) setTs(new Date(signal));
  }, [signal]);
  return ts;
};