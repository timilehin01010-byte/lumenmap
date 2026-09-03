"use client";

import { Activity, ArrowDown, Boxes, Layers, Wallet, Zap } from "lucide-react";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricInfo } from "@/components/metrics/MetricInfo";
import { classifyFreshness } from "@/lib/freshness";
import {
  METRIC_DEFINITIONS,
  type KpiMetricId,
} from "@/lib/metrics/definitions";
import { formatNumber, formatPercent } from "@/lib/utils";

const KPI_CONFIG = [
  {
    key: "totalOps" as const satisfies KpiMetricId,
    icon: Activity,
    format: (value: number) => formatNumber(value),
  },
  {
    key: "sorobanShare" as const satisfies KpiMetricId,
    icon: Zap,
    format: (value: number) => formatPercent(value),
  },
  {
    key: "topCategory" as const satisfies KpiMetricId,
    icon: Layers,
    format: (value: string) => value,
  },
  {
    key: "activeContracts" as const satisfies KpiMetricId,
    icon: Boxes,
    format: (value: number) => formatNumber(value),
  },
  {
    key: "activeWallets" as const satisfies KpiMetricId,
    icon: Wallet,
    format: (value: number) => formatNumber(value),
  },
  {
    key: "activeDestinationAccounts" as const satisfies KpiMetricId,
    icon: ArrowDown,
    format: (value: number) => formatNumber(value),
  },
];

export function KpiCards() {
  const { data, isLoading } = useDashboard();
  const freshnessState = classifyFreshness(data?.sourceTimestamp);
  if (isLoading || !data) {
    return (
      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4 xl:grid-cols-6"
        aria-busy="true"
      >
        {KPI_CONFIG.map((item) => (
          <Card key={item.key}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton className="h-4 w-24 max-w-full" />
                <Skeleton className="h-4 w-16 max-w-full sm:hidden" />
              </div>
              <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 max-w-full" />
              {METRIC_DEFINITIONS[item.key].sparkline ? (
                <Sparkline loading />
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  const buckets = data.timeseries?.buckets ?? [];
  const series: Partial<Record<KpiMetricId, number[]>> = {
    totalOps: buckets.map((bucket) => bucket.operations),
    sorobanShare: buckets.map((bucket) =>
      bucket.operations > 0
        ? ((bucket.sorobanOperations ?? 0) / bucket.operations) * 100
        : 0,
    ),
  };
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4 xl:grid-cols-6">
      {KPI_CONFIG.map((item) => {
        const Icon = item.icon;
        const definition = METRIC_DEFINITIONS[item.key];
        const kpi = data.kpis[item.key];
        const value = typeof kpi === "string" ? kpi : kpi.value;
        const points = series[item.key];
        return (
          <Card key={item.key}>
            <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
              <div className="flex min-w-0 items-center gap-1.5">
                <CardTitle>{definition.title}</CardTitle>
                <MetricInfo metric={definition} />
              </div>
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-surface-accent" />
            </CardHeader>
            <CardContent>
              <p
                data-testid={`kpi-value-${item.key}`}
                className="text-2xl font-semibold text-text-primary"
              >
                {item.format(value as never)}
              </p>
              {freshnessState === "stale" ? (
                <p className="mt-0.5 text-xs font-medium text-amber-400">
                  (stale)
                </p>
              ) : null}
              {definition.sparkline && points && points.length > 1 ? (
                <Sparkline data={points} label={`${definition.title} trend`} />
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
