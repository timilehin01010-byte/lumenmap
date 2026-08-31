"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { DashboardProvider, useDashboard } from "@/components/dashboard/DashboardProvider";
import { CategoryShareChart } from "@/components/dashboard/CategoryShareChart";
import { DetailPanel } from "@/components/dashboard/DetailPanel";
import { FreshnessIndicator } from "@/components/dashboard/FreshnessIndicator";
import { FreshnessWarning } from "@/components/dashboard/FreshnessWarning";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { NetworkTreemap } from "@/components/dashboard/NetworkTreemap";
import { ProtocolBarChart } from "@/components/dashboard/ProtocolBarChart";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { TimeSeriesChart } from "@/components/dashboard/TimeSeriesChart";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { DashboardSearch } from "@/components/dashboard/DashboardSearch";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

const SUPPORTED_PERIODS = ["1d", "7d", "30d", "90d"];

function normalizePeriod(period: string | null, fallback: string): string {
  return period !== null && SUPPORTED_PERIODS.includes(period) ? period : fallback;
}

function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function usePeriodData(period: string) {
  const [state, setState] = useState<{
    data: any;
    error: Error | null;
    loading: boolean;
  }>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() {
    let cancelled = false;
    setState({ data: null, error: null, loading: true });
    fetch(`/api/dashboard?period=${period}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load period ${period}`);
        }
        return res.json();
      })
      .then((json) => {
        if (!cancelled) {
          setState({ data: json, error: null, loading: false });
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setState({ data: null, error: err, loading: false });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  return state;
}

function PeriodPanel({ title, query }: { title: string; query: { data: any; error: Error | null; loading: boolean } }) {
  const { data, error, loading } = query;
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {loading ? (
        <p className="mt-2 text-sm text-zinc-400">Loading...</p>
      ) : error ? (
        <p className="mt-2 text-sm text-red-400">Failed to load data for this period.</p>
      ) : data ? (
        <div className="mt-2 space-y-4">
          <div>
            <p className="text-sm text-zinc-400">Total Operations</p>
            <p className="text-2xl font-semibold text-white">{data.totalOperations?.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-zinc-400">Soroban Share</p>
            <p className="text-2xl font-semibold text-white">{data.sorobanShare?.toFixed(2)}%</p>
          </div>
          {data.categories && data.categories.length > 0 ? (
            <div>
              <p className="text-sm text-zinc-400">Category Share</p>
              <ul className="mt-1 space-y-1">
                {data.categories.map((cat: any) => (
                  <li key={cat.name} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-300">{cat.name}</span>
                    <span className="text-white">{cat.value}%</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CompareDashboard({ baseline, comparison, onExit }: { baseline: string; comparison: string; onExit: () => void }) {
  const [base, setBase] = useState(() => normalizePeriod(baseline, "1d"));
  const [comp, setComp] = useState(() => normalizePeriod(comparison, "7d"));
  useEffect(() => {
    setBase(normalizePeriod(baseline, "1d"));
    setComp(normalizePeriod(comparison, "7d"));
  }, [baseline, comparison]);
  const router = useRouter();
  const searchParams = useSearchParams();



  const baseQuery = usePeriodData(base);
  const compQuery = usePeriodData(comp);

  const baseTotal = baseQuery.data?.totalOperations ?? 0;
  const compTotal = compQuery.data?.totalOperations ?? 0;
  const baseShare = baseQuery.data?.sorobanShare ?? 0;
  const compShare = compQuery.data?.sorobanShare ?? 0;

  const totalDelta = compTotal - baseTotal;
  const totalDeltaPct = baseTotal !== 0 ? (totalDelta / baseTotal) * 100 : 0;
  const shareDelta = compShare - baseShare;
  const shareDeltaPct = baseShare !== 0 ? (shareDelta / baseShare) * 100 : 0;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col gap-6 overflow-x-hidden px-3 py-6 sm:px-6 lg:px-8">
      <header className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y3">
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Compare Periods</h1>
          <p className="text-sm text-zinc-400">Side-by-side comparison of preset periods.</p>
        </div>
        <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-2">
          <select
            value={base}
            onChange={(e) => {
              const newBase = e.target.value;
              setBase(newBase);
              const params = new URLSearchParams(searchParams.toString());
              params.set("compare", "true");
              params.set("baseline", newBase);
              params.set("comparison", comp);
              params.delete("period");
              router.replace(`?${params.toString()}`);
            }}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white focus:border-stellar-light focus:outline-none"
          >
            {SUPPORTED_PERIODS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <span className="text-zinc-400">vs</span>
          <select
            value={comp}
            onChange={(e) => {
              const newComp = e.target.value;
              setComp(newComp);
              const params = new URLSearchParams(searchParams.toString());
              params.set("compare", "true");
              params.set("baseline", base);
              params.set("comparison", newComp);
              params.delete("period");
              router.replace(`?${params.toString()}`);
            }}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white focus:border-stellar-light focus:outline-none"
          >
            {SUPPORTED_PERIODS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            onClick={onExit}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:border-stellar-light hover:text-white focus:outline-none focus:ring-2 focus:ring-stellar"
          >
            Exit compare
          </button>
        </div>
      </header>

      <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2">
        <PeriodPanel title="Baseline" query={baseQuery} />
        <PeriodPanel title="Comparison" query={compQuery} />
      </div>

      {baseQuery.data && compQuery.data ? (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="text-lg font-semibold text-white">Delta Summary</h2>
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-zinc-400">Total Operations</p>
              <p className="text-2xl font-semibold text-white">
                {totalDelta > 0 ? "+" : ""}{totalDelta.toLocaleString()}
                <span className="ml-2 text-base text-zinc-400">({formatPercent(totalDeltaPct)})</span>
              </p>
            </div>
            <div>
              <p className="text-sm text-zinc-400">Soroban Share</p>
              <p className="text-2xl font-semibold text-white">
                {shareDelta > 0 ? "+" : ""}{shareDelta.toFixed(2)}
                <span className="ml-2 text-base text-zinc-400">({formatPercent(shareDeltaPct)})</span>
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DashboardContent({ onCompareModeChange }: { onCompareModeChange?: () => void }) {
  const { selectedNode } = useDashboard();

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col gap-6 overflow-x-hidden px-3 py-6 sm:px-6 lg:px-8">
      <header className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y3">
          <div className="flex flex-wrap items-center gap-3">
            <Image
              src="/logo.png"
              alt="LumenMap"
              width={44}
              height={44}
              className="shrink-0"
              priority
            />
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                LumenMap
              </h1>
              <p className="text-sm text-zinc-400">
                Stellar network activity across mainnet.
              </p>
            </div>
            <Badge>Mainnet</Badge>
          </div>
          <FreshnessIndicator />
            <p className="text-xs text-zinc-500">
              <a
                href="/methodology"
                className="text-stellar-light hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stellar rounded-sm"
              >
                Metric methodology
              </a>
              {" · "}definitions on each KPI
            </p>
        </div>
        <div className="min-w-0 shrink-0">
          <PeriodSelector />
          {onCompareModeChange && (
            <button
              onClick={onCompareModeChange}
              className="mt-2 text-sm text-stellar-light hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stellar rounded-sm"
            >
              Compare periods
            </button>
          )}
        </div>
      </header>
      <FreshnessWarning />
      <DashboardSearch />
      <KpiCards />
      <CategoryShareChart />
      <div className={`grid min-w-0 grid-cols-1 gap-6 transition-all duration-300 ${selectedNode ? "xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]" : "xl:grid-cols-1"}`}>
        <div className="min-w-0">
          <NetworkTreemap />
        </div>
        {selectedNode && (
          <div id="detail-panel-container" className="min-w-0 scroll-mt-4">
            <DetailPanel />
          </div>
        )}
      </div>
      <ProtocolBarChart />
      <ActivityHeatmap />
      <TimeSeriesChart />
    </div>
  );
}

export function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCompare = searchParams.get("compare") === "true";
  const baseline = normalizePeriod(searchParams.get("baseline"), "1d");
  const comparison = normalizePeriod(searchParams.get("comparison"), "7d");

  const handleCompareModeChange = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    const currentPeriod = normalizePeriod(searchParams.get("period"), "1d");
    const nextComparison = comparison === currentPeriod ? (currentPeriod === "1d" ? "7d" : "1d") : comparison;
    params.set("compare", "true");
    params.set("baseline", currentPeriod);
    params.set("comparison", nextComparison);
    params.delete("period");
    router.replace(`?${params.toString()}`);
  }, [searchParams, comparison, router]);

  const handleExitCompare = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    const baselineExit = normalizePeriod(searchParams.get("baseline"), "1d");
    params.delete("compare");
    params.delete("baseline");
    params.delete("comparison");
    params.set("period", baselineExit);
    router.replace(`?${params.toString()}`);
  }, [searchParams, router]);

  if (isCompare) {
    return <CompareDashboard baseline={baseline} comparison={comparison} onExit={handleExitCompare} />;
  }

  return (
    <DashboardProvider>
      <DashboardContent onCompareModeChange={handleCompareModeChange} />
    </DashboardProvider>
  );
}
