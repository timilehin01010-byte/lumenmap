import { isValidPeriod } from "@/lib/periods";
import type { DashboardMetricId, Period, TreemapNode } from "@/lib/types";
import type { TreemapViewId } from "@/lib/constants";
import { TREEMAP_VIEWS } from "@/lib/constants";

const METRIC_IDS: DashboardMetricId[] = [
  "ops",
  "xlm_volume",
  "usdc",
  "transactions",
  "protocol_tvl",
];

export function isValidMetric(
  value: string | null | undefined,
): value is DashboardMetricId {
  return !!value && METRIC_IDS.includes(value as DashboardMetricId);
}

export function isValidTreemapView(
  value: string | null | undefined,
): value is TreemapViewId {
  return TREEMAP_VIEWS.some((view) => view.id === value);
}

/** Stable path segment for a treemap node (prefer id, fall back to name). */
export function treemapPathSegment(node: TreemapNode): string {
  return String(node.id ?? node.name);
}

export function encodeDrillPath(path: TreemapNode[]): string | null {
  if (path.length === 0) return null;
  return path.map((node) => encodeURIComponent(treemapPathSegment(node))).join("/");
}

export function decodeDrillPathParam(value: string | null): string[] {
  if (!value) return [];
  return value
    .split("/")
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .filter(Boolean);
}

/**
 * Walk the treemap using encoded path segments. Stops at the first missing
 * child so stale share links restore the deepest still-valid level.
 */
export function resolveDrillPath(
  root: TreemapNode,
  segments: string[],
): TreemapNode[] {
  const resolved: TreemapNode[] = [];
  let current = root;

  for (const segment of segments) {
    const child = current.children?.find(
      (node) => treemapPathSegment(node) === segment || node.name === segment,
    );
    if (!child) break;
    resolved.push(child);
    current = child;
  }

  return resolved;
}

export type DashboardUrlState = {
  period: Period;
  metric: DashboardMetricId;
  view?: TreemapViewId;
  pathSegments: string[];
};

export function parseDashboardUrlSearch(
  search: string,
): Partial<DashboardUrlState> {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const next: Partial<DashboardUrlState> = {
    pathSegments: decodeDrillPathParam(params.get("path")),
  };

  const period = params.get("period");
  if (isValidPeriod(period)) next.period = period;

  const metric = params.get("metric");
  if (isValidMetric(metric)) next.metric = metric;

  const view = params.get("view");
  if (isValidTreemapView(view)) next.view = view;

  return next;
}

export function writeDashboardUrlSearch(input: {
  period: Period;
  metric: DashboardMetricId;
  view: TreemapViewId;
  path: TreemapNode[];
  currentSearch?: string;
}): string {
  const params = new URLSearchParams(
    (input.currentSearch ?? "").replace(/^\?/, ""),
  );
  params.set("period", input.period);
  params.set("metric", input.metric);
  params.set("view", input.view);

  const encodedPath = encodeDrillPath(input.path);
  if (encodedPath) params.set("path", encodedPath);
  else params.delete("path");

  const query = params.toString();
  return query ? `?${query}` : "";
}
