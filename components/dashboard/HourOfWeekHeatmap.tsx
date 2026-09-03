"use client";

import { useMemo, useRef, useState } from "react";
import { BarChart3 } from "lucide-react";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { HeatmapBucket } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EMPTY_BUCKETS: HeatmapBucket[] = [];
const LEVEL_CLASSES = [
  "bg-zinc-900 border-zinc-800",
  "bg-cyan-950 border-cyan-900/60",
  "bg-cyan-800/70 border-cyan-700/60",
  "bg-cyan-500/80 border-cyan-400/70",
  "bg-cyan-300 border-cyan-200",
];

function intensity(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  const ratio = value / max;
  if (ratio >= 0.85) return 4;
  if (ratio >= 0.55) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

export function HourOfWeekHeatmap() {
  const { data, isLoading, metric } = useDashboard();
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const buckets = data?.heatmap?.buckets ?? EMPTY_BUCKETS;
  const useTransactions = metric === "transactions";
  const unit = useTransactions ? "transactions" : "operations";
  const values = useMemo(
    () =>
      buckets.map((bucket) =>
        useTransactions ? bucket.transactions : bucket.operations,
      ),
    [buckets, useTransactions],
  );
  const max = Math.max(0, ...values);

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-56 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (buckets.length === 0 || values.every((value) => value === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hour-of-week activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400">
            No hourly activity is available for this period.
          </p>
        </CardContent>
      </Card>
    );
  }

  const active = activeIndex === null ? null : buckets[activeIndex];
  const focusCell = (index: number) => {
    const next = (index + buckets.length) % buckets.length;
    cellRefs.current[next]?.focus();
    setActiveIndex(next);
  };

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-cyan-400" />
          Hour-of-week activity
        </CardTitle>
        <p className="text-xs text-zinc-400">
          All 168 UTC weekday/hour buckets. Color represents {unit}.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 overflow-x-auto">
        <div
          className="grid min-w-[720px] grid-cols-[2.5rem_repeat(24,minmax(1.5rem,1fr))] gap-1"
          role="grid"
          aria-label={`UTC hour-of-week heatmap by ${unit}`}
        >
          <span />
          {Array.from({ length: 24 }, (_, hour) => (
            <span key={hour} className="text-center text-[10px] text-zinc-500">
              {hour}
            </span>
          ))}
          {DAYS.map((day, dayIndex) => (
            <div key={day} className="contents">
              <span className="self-center text-xs text-zinc-400">{day}</span>
              {buckets
                .slice(dayIndex * 24, dayIndex * 24 + 24)
                .map((bucket, hour) => {
                  const index = dayIndex * 24 + hour;
                  const value = values[index] ?? 0;
                  return (
                    <button
                      key={`${dayIndex}-${hour}`}
                      ref={(node) => {
                        cellRefs.current[index] = node;
                      }}
                      type="button"
                      role="gridcell"
                      aria-label={`${day} ${hour}:00 UTC: ${formatNumber(value)} ${unit}`}
                      title={`${day} ${hour}:00 UTC\n${formatNumber(value)} ${unit}`}
                      className={`aspect-square rounded-sm border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${LEVEL_CLASSES[intensity(value, max)]}`}
                      onFocus={() => setActiveIndex(index)}
                      onMouseEnter={() => setActiveIndex(index)}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowRight") {
                          event.preventDefault();
                          focusCell(index + 1);
                        }
                        if (event.key === "ArrowLeft") {
                          event.preventDefault();
                          focusCell(index - 1);
                        }
                        if (event.key === "ArrowDown") {
                          event.preventDefault();
                          focusCell(index + 24);
                        }
                        if (event.key === "ArrowUp") {
                          event.preventDefault();
                          focusCell(index - 24);
                        }
                      }}
                    />
                  );
                })}
            </div>
          ))}
        </div>
        {active ? (
          <p className="text-xs text-zinc-300">
            {DAYS[active.dayOfWeek]} {active.hourOfDay}:00 UTC ·{" "}
            {formatNumber(values[activeIndex ?? 0] ?? 0)} {unit}
          </p>
        ) : null}
        <table className="sr-only">
          <caption>UTC hour-of-week activity values</caption>
          <thead>
            <tr>
              <th>Day</th>
              <th>Hour</th>
              <th>Operations</th>
              <th>Transactions</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((bucket) => (
              <tr key={`${bucket.dayOfWeek}-${bucket.hourOfDay}`}>
                <td>{DAYS[bucket.dayOfWeek]}</td>
                <td>{bucket.hourOfDay}:00</td>
                <td>{bucket.operations}</td>
                <td>{bucket.transactions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
