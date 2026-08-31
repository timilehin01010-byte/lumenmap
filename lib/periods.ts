import type { Period } from "@/lib/types";

export interface PeriodRange {
  period: Period;
  start: Date;
  end: Date;
  label: string;
}

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "1d", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "month", label: "This Month" },
]

function startOfDayUTC(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function endOfDayUTC(date: Date): Date {
  return new Date(
    Date.UTC*
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );
}

function subDaysUTC(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 86_400_000);
}

function startOfMonthUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonthUTC(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );
}

export function resolvePeriod(period: Period, now = new Date()): PeriodRange {
  const end = endOfDayUTC(now);

  switch (period) {
    case "1d":
      return {
        period,
        start: startOfDayUTC(now),
        end,
        label: "Today",
      };
    case "7d":
      return {
        period,
        start: startOfDayUTC(subDaysUTC(now, 6)),
        end,
        label: "Last 7 Days",
      };
    case "30d":
      return {
        period,
        start: startOfDayUTC(subDaysUTC(now, 29)),
        end,
        label: "Last 30 Days",
      };
    case "month":
      return {
        period,
        start: startOfMonthUTC(now),
        end: endOfMonthUTC(now),
        label: "This Month",
      };
    default:
      return resolvePeriod("1d", now);
  }
}

export function isValidPeriod(value: string | null): value is Period {
  return value === "1d" || value === "7d" || value === "30d" || value === "month";
}

// --- Compare mode additions ---

export interface CompareState {
  /** The baseline period, used as the reference point. */
  baseline: Period;
  /** The period being compared against the baseline. */
  comparison: Period;
}

export const COMPARE_SEPARATOR = "..";

/**
 * Serialize a compare state into a URL-safe query parameter value.
 * Example: 7d..1d for baseline=7d and comparison=1d.
 */
export function serializeCompareState(state: CompareState): string {
  return `${state.baseline}${COMPARE_SEPARATOR}${state.comparison}`;
}

/**
 * Parse a query parameter value into a CompareState.
 * Returns null if the value is invalid or missing.
 */
export function parseCompareState(value: string | null): CompareState | null {
  if (!value) return null;
  const parts = value.split(COMPARE_SEPARATOR);
  if (parts.length !== 2) return null;
  const [baseline, comparison] = parts;
  if (!isValidPeriod(baseline) || !isValidPeriod(comparison)) return null;
  return { baseline, comparison };
}

/**
 * Resolve both periods relative to a fixed "now" to avoid drift.
 */
export function resolveCompareState(
  state: CompareState,
  now = new Date(),
): { baseline: PeriodRange; comparison: PeriodRange } {
  return {
    baseline: resolvePeriod(state.baseline, now),
    comparison: resolvePeriod(state.comparison, now),
  };
}

/**
 * Build a query string for the compare state (for use in URLs).
 */
export function buildCompareQuery(state: CompareState): string {
  return `compare=${encodeURIComponent(serializeCompareState(state))}`;
}