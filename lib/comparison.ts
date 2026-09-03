export interface NumericDelta {
  absolute: number;
  percent: number | null;
}

export function calculateDelta(
  baseline: number,
  comparison: number,
): NumericDelta {
  const absolute = comparison - baseline;
  return {
    absolute,
    percent: baseline === 0 ? null : (absolute / baseline) * 100,
  };
}
