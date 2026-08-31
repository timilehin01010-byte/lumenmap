"use client";

import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { formatNumber } from "@/lib/utils";

type HeatmapCellState = "missing" | "zero" | "value" | "partial";

interface HeatmapCell {
  dateKey: string;
  label: string;
  operations: number;
  transactions: number;
  state: HeatmapCellState;
  isPartial: boolean;
}

const LEVELS = [
  { label: "None", className: "bg-zinc-900 border-zinc-800" },
  { label: "Low", className: "bg-cyan-950 border-cyan-900/60" },
  { label: "Medium", className: "bg-cyan-800/70 border-cyan-700/60" },
  { label: "High", className: "bg-cyan-500/80 border-cyan-400/70" },
  { label: "Peak", className: "bg-cyan-300 border-cyan-200" },
];

function intensityLevel(value: number, max: number): number {
  if (value <= 0 || max <= 0) {
    return 0;
  }
  const ratio = value / max;
  if (ratio >= 0.85) return 4;
  if (ratio >= 0.55) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

function toUtcDateKey(timestamp: string): string {
  return timestamp.substring(0, 10);
}

export function ActivityHeatmap() {
  const { data, isLoading } = useDashboard();
  const [focusedKey, setFocusedKey] = useState<string | null>(null);

  const cells = useMemo(() => {
    const buckets = data?.timeseries?.buckets ?? [];
    const dailyBuckets =
      data?.timeseries?.granularity === "hour"
        ? buckets.reduce(
            (acc, bucket) => {
              const key = toUtcDateKey(bucket.timestamp);
              const existing = acc.get(key) ?? {
                operations: 0,
                transactions: 0,
                isPartial: false,
                label: key,
              };
              acc.set(key, {
                operations: existing.operations + bucket.operations,
                transactions: existing.transactions + bucket.transactions,
                isPartial: existing.isPartial || Boolean(bucket.isPartial),
                label: key,
              });
              return acc;
            },
            new Map<
              string,
              {
                operations: number;
                transactions: number;
                isPartial: boolean;
                label: string;
              }
            >(),
          )
        : new Map(
            buckets.map((bucket) => [
              toUtcDateKey(bucket.timestamp),
              {
                operations: bucket.operations,
                transactions: bucket.transactions,
                isPartial: Boolean(bucket.isPartial),
                label: bucket.label,
              },
            ]),
          );

    const periodStart = data?.start ? toUtcDateKey(data.start) : null;
    const periodEnd = data?.end ? toUtcDateKey(data.end) : null;

    const result: HeatmapCell[] = [...dailyBuckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, bucket]) => {
        const inRange =
          periodStart && periodEnd
            ? dateKey >= periodStart && dateKey <= periodEnd
            : true;

        let state: HeatmapCellState = "value";
        if (!inRange) {
          state = "missing";
        } else if (bucket.operations === 0 && bucket.transactions === 0) {
          state = "zero";
        }

        return {
          dateKey,
          label: bucket.label,
          operations: bucket.operations,
          transactions: bucket.transactions,
          state,
          isPartial: bucket.isPartial,
        };
      });

    return result;
  }, [data]);

  const maxOps = useMemo(
    () => Math.max(0, ...cells.map((cell) => cell.operations)),
    [cells],
  );

  const activeCell =
    cells.find((cell) => cell.dateKey === focusedKey) ?? cells[cells.length - 1];

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-28 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (cells.length <= 1) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
            <BarChart3 className="h-5 w-5 text-cyan-400" />
            Daily Activity Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400">
            Select a multi-day period to view the UTC daily activity heatmap.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
      <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-white sm:text-lg">
            <BarChart3 className="h-5 w-5 text-cyan-400" />
            Daily Activity Calendar
          </CardTitle>
          <p className="text-xs text-zinc-400">
            UTC calendar cells colored by daily operation count. Hover or focus a cell for exact values.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
          <span className="font-medium text-zinc-300">Operations</span>
          {LEVELS.map((level) => (
            <span key={level.label} className="flex items-center gap-1">
              <span
                className={`inline-block h-3 w-3 rounded-sm border ${level.className}`}
                aria-hidden="true"
              />
              {level.label}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm border border-dashed border-zinc-500 bg-zinc-950" />
            Missing
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div
          className="grid gap-1.5 sm:gap-2"
          style={{
            gridTemplateColumns: `repeat(${Math.min(cells.length, 14)}, minmax(0, 1fr))`,
          }}
          role="grid"
          aria-label="Daily network activity heatmap"
        >
          {cells.map((cell) => {
            const level =
              cell.state === "missing"
                ? null
                : intensityLevel(cell.operations, maxOps);
            const levelClass =
              cell.state === "missing"
                ? "border-dashed border-zinc-600 bg-zinc-950"
                : cell.state === "zero"
                  ? LEVELS[0].className
                  : LEVELS[level ?? 0].className;

            return (
              <button
                key={cell.dateKey}
                type="button"
                role="gridcell"
                aria-label={`${cell.dateKey}: ${cell.state === "missing" ? "no data" : `${formatNumber(cell.operations)} operations`}${cell.isPartial ? ", partial day" : ""}`}
                title={`${cell.dateKey}\nOperations: ${formatNumber(cell.operations)}\nTransactions: ${formatNumber(cell.transactions)}${cell.isPartial ? "\nPartial day" : ""}`}
                className={`aspect-square min-h-8 rounded-sm border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${levelClass} ${cell.isPartial ? "ring-1 ring-dashed ring-cyan-300/70" : ""}`}
                onMouseEnter={() => setFocusedKey(cell.dateKey)}
                onFocus={() => setFocusedKey(cell.dateKey)}
              />
            );
          })}
        </div>

        {activeCell ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-300">
            <span className="font-semibold text-white">{activeCell.dateKey}</span>
            {" · "}
            <span>{formatNumber(activeCell.operations)} operations</span>
            {" · "}
            <span>{formatNumber(activeCell.transactions)} transactions</span>
            {activeCell.isPartial ? (
              <span className="ml-2 rounded-full border border-cyan-800/60 bg-cyan-950 px-2 py-0.5 text-[10px] text-cyan-300">
                Partial day
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="sr-only">
          <table>
            <caption>Daily network activity values</caption>
            <thead>
              <tr>
                <th scope="col">UTC date</th>
                <th scope="col">Operations</th>
                <th scope="col">Transactions</th>
                <th scope="col">Partial</th>
              </tr>
            </thead>
            <tbody>
              {cells.map((cell) => (
                <tr key={`row-${cell.dateKey}`}>
                  <th scope="row">{cell.dateKey}</th>
                  <td>{cell.operations}</td>
                  <td>{cell.transactions}</td>
                  <td>{cell.isPartial ? "yes" : "no"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
