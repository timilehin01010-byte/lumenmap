"use client";

import { PERIOD_OPTIONS } from "@/lib/periods";
import type { Period } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard/DashboardProvider";

export function PeriodSelector() {
  const {
    period,
    setPeriod,
    compareMode,
    setCompareMode,
    comparePeriod,
    setComparePeriod,
  } = useDashboard();

  const render = (value: Period, setter: (value: Period) => void) => (\n    <div className="flex flex-wrap gap-2">\n      {PERIOD_OPTIONS.map((o) => (\n        <Button\n          key={o.value}\n          variant={value === o.value ? "default" : "outline"}\n          onClick={() => setter(o.value)}\n        >\n          {o.label}\n        </Button>\n      ))}\n    </div>\n  );\n  \n  return (\n    <div>\n      <Button onClick={() => setCompareMode(!compareMode)}>\n        {compareMode ? "Single" : "Compare"}\n      </Button>\n      {compareMode ? (\n        <div>\n          <span>Baseline</span>\n          {render(period, setPeriod)}\n          <span>Comparison</span>\n          {render(comparePeriod ?? period, setComparePeriod)}\n        </div>\n      ) : (\n        render(period, setPeriod)\n      )}\n    </div>\n  );\n}