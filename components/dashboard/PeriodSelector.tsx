"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PERIOD_OPTIONS } from '@/lib/periods';
import type { Period } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useDashboard } from '@/components/dashboard/DashboardProvider';

export function PeriodSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    period,
    setPeriod,
    compareMode,
    setCompareMode,
    comparePeriod,
    setComparePeriod,
  } = useDashboard();

  // Restore state from URL query params on mount.
  useEffect(() => {
    const urlPeriod = searchParams.get("period") as Period | null;
    const urlCompareMode = searchParams.get("compare") === "true";
    const urlComparePeriod = searchParams.get("comparePeriod") as Period | null;

    if (urlPeriod && PERIOD_OPTIONS.some((o) => o.value === urlPeriod)) {
      setPeriod(urlPeriod);
    }
    if (urlCompareMode) {
      setCompareMode(true);
    }
    if (urlComparePeriod && PERIOD_OPTIONS.some((o) => o.value === urlComparePeriod)) {
      setComparePeriod(urlComparePeriod);
    }
    // Only run once on component mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep URL in sync with the selected periods/compare mode.
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    if (compareMode) {
      params.set("compare", "true");
      params.set("comparePeriod", comparePeriod ?? period);
    } else {
      params.delete("compare");
      params.delete("comparePeriod");
    }
    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery !== currentQuery) {
      router.replace("|?nextQuery", { scroll: false });
    }
  }, [period, compareMode, comparePeriod, router, searchParams]);

  const render = (value: Period, setter: (value: Period) => void) => (
    <div className="flex flex-wrap gap-2">
      {PERIOD_OPTIONS.map((o) => (
        <Button
          key={o.value}
          variant={value === o.value ? "default" : "outline"}
          onClick={() => setter(o.value)}
        >
          {o.label}
        </Button>
      ))
    }</div>
  );

  return (
    <div>
      <Button onClick={() => setCompareMode(!compareMode)}>
        {compareMode ? "Single" : "Compare"}
      </Button>
      {compareMode ? (
        <div className="flex flex-row gap-4 items-start">
          <div>
            <span>Baseline</span>
            {render(period, setPeriod)}
          </div>
          <div>
            <span>Comparison</span>
            {render(comparePeriod ?? period, setComparePeriod)}
          </div>
        </div>
      ) : (
        render(period, setPeriod)
      )}
    </div>
  );
}