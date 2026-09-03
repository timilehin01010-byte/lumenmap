"use client";

import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateDelta } from "@/lib/comparison";
import { PERIOD_OPTIONS } from "@/lib/periods";
import { formatNumber, formatPercent } from "@/lib/utils";

function signed(value: number): string {
  return `${value > 0 ? "+" : ""}${formatNumber(value)}`;
}
function deltaLabel(baseline: number, comparison: number): string {
  const delta = calculateDelta(baseline, comparison);
  return `${signed(delta.absolute)} (${delta.percent === null ? "n/a" : formatPercent(delta.percent)})`;
}

export function ComparisonPanel() {
  const {
    period,
    comparePeriod,
    data,
    comparisonData,
    comparisonLoading,
    comparisonError,
    metric,
  } = useDashboard();
  if (!comparePeriod) return null;
  const baselineLabel =
    PERIOD_OPTIONS.find((item) => item.value === period)?.label ?? period;
  const comparisonLabel =
    PERIOD_OPTIONS.find((item) => item.value === comparePeriod)?.label ??
    comparePeriod;

  if (comparisonLoading)
    return (
      <Card aria-busy="true">
        <CardHeader>
          <CardTitle>Period comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400">Loading {comparisonLabel}…</p>
        </CardContent>
      </Card>
    );
  if (comparisonError || !comparisonData || !data)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Period comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-amber-400">
            Comparison data is unavailable. The primary dashboard remains
            active.
          </p>
        </CardContent>
      </Card>
    );

  const baseOps = data.kpis.totalOps.value;
  const compOps = comparisonData.kpis.totalOps.value;
  const baseShare = data.kpis.sorobanShare.value;
  const compShare = comparisonData.kpis.sorobanShare.value;
  const chartKey = metric === "transactions" ? "transactions" : "operations";
  const baseChart = data.timeseries?.totals[chartKey] ?? 0;
  const compChart = comparisonData.timeseries?.totals[chartKey] ?? 0;
  const maxChart = Math.max(baseChart, compChart, 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Period comparison</CardTitle>
        <p className="text-xs text-zinc-400">
          {baselineLabel} baseline vs {comparisonLabel}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 p-3">
            <p className="text-xs text-zinc-500">Total operations</p>
            <p className="text-lg text-white">
              {formatNumber(baseOps)} → {formatNumber(compOps)}
            </p>
            <p className="text-xs text-cyan-300">
              {deltaLabel(baseOps, compOps)}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <p className="text-xs text-zinc-500">Soroban share</p>
            <p className="text-lg text-white">
              {formatPercent(baseShare)} → {formatPercent(compShare)}
            </p>
            <p className="text-xs text-cyan-300">
              {deltaLabel(baseShare, compShare)}
            </p>
          </div>
        </div>
        <div aria-label={`${chartKey} comparison chart`} className="space-y-3">
          {[
            [baselineLabel, baseChart],
            [comparisonLabel, compChart],
          ].map(([label, rawValue]) => {
            const value = Number(rawValue);
            return (
              <div
                key={String(label)}
                className="grid grid-cols-[7rem_1fr_auto] items-center gap-2 text-xs"
              >
                <span className="text-zinc-400">{label}</span>
                <div className="h-3 rounded bg-zinc-900">
                  <div
                    className="h-3 rounded bg-cyan-500"
                    style={{ width: `${(value / maxChart) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-zinc-200">
                  {formatNumber(value)}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
