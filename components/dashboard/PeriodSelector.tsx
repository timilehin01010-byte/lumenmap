"use client";

import { useCallback, useRef } from "react";
import { PERIOD_OPTIONS } from "@/lib/periods";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard/DashboardProvider";

export function PeriodSelector() {
  const { period, setPeriod } = useDashboard();
  const groupRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const options = PERIOD_OPTIONS;
      const currentIndex = options.findIndex((o) => o.value === period);
      let nextIndex: number | null = null;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        nextIndex = (currentIndex + 1) % options.length;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        nextIndex = (currentIndex - 1 + options.length) % options.length;
      }

      if (nextIndex !== null) {
        e.preventDefault();
        const nextValue = options[nextIndex].value;
        setPeriod(nextValue);
        const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>("[role=radio]");
        buttons?.[nextIndex]?.focus();
      }
    },
    [period, setPeriod],
  );

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label="Time period"
      className="flex flex-wrap gap-2"
      onKeyDown={handleKeyDown}
    >
      {PERIOD_OPTIONS.map((option) => (
        <Button
          key={option.value}
          role="radio"
          aria-checked={period === option.value}
          variant={period === option.value ? "default" : "outline"}
          size="sm"
          tabIndex={period === option.value ? 0 : -1}
          onClick={() => setPeriod(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
