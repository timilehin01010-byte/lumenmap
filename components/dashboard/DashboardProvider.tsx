"use client";

import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { TreemapViewId } from "@/lib/constants";
import {
  parseDashboardUrlSearch,
  resolveDrillPath,
  writeDashboardUrlSearch,
} from "@/lib/dashboard-url-state";
import { findTreemapPath, type SearchResult } from "@/lib/search";
import type {
  ActivityVisualizationResponse,
  ApiErrorResponse,
  DashboardMetricId,
  Period,
  SelectedNode,
  TreemapNode,
} from "@/lib/types";

interface DashboardContextValue {
  period: Period;
  setPeriod: (period: Period) => void;
  comparePeriod: Period | null;
  setComparePeriod: (period: Period | null) => void;
  treemapView: TreemapViewId;
  setTreemapView: (view: TreemapViewId) => void;
  metric: DashboardMetricId;
  setMetric: (metric: DashboardMetricId) => void;
  data?: ActivityVisualizationResponse;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  error: Error | null;
  comparisonData?: ActivityVisualizationResponse;
  comparisonIsLoading: boolean;
  comparisonIsError: boolean;
  comparisonIsFetching: boolean;
  comparisonError: Error | null;
  refetchComparison: () => Promise<unknown>;
  refetch: () => Promise<unknown>;
  selectedNode: SelectedNode | null;
  setSelectedNode: (node: SelectedNode | null) => void;
  activeLevelPath: TreemapNode[];
  setActiveLevelPath: (path: TreemapNode[]) => void;
  /** Active search focus used to open treemap context. */
  focusRequest: SearchResult | null;
  selectSearchResult: (result: SearchResult) => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

async function fetchActivity(
  period: Period,
): Promise<ActivityVisualizationResponse> {
  const response = await fetch(`/api/v1/activity?period=${period}`);
  if (!response.ok) {
    const body = (await response.json()) as ApiErrorResponse;
    throw new Error(body.message ?? "Failed to load activity data");
  }
  return response.json() as Promise<ActivityVisualizationResponse>;
}

function searchResultToSelectedNode(result: SearchResult): SelectedNode {
  return {
    name: result.label,
    value: result.opCount ?? 0,
    share: 0,
    meta: {
      type: result.nodeType,
      id: result.id ?? result.issuer,
      category: result.category,
      protocol: result.protocol,
      opCount: result.opCount,
    },
  };
}

function selectedNodeFromSearch(
  data: ActivityVisualizationResponse | undefined,
  result: SearchResult,
): SelectedNode {
  const root = data?.treemaps[result.treemapView] as
    | TreemapNode<number | string>
    | undefined;
  if (root) {
    const path = findTreemapPath(root, result);
    if (path && path.length > 0) {
      const matched = path[path.length - 1];
      const value =
        matched.value ?? matched.meta?.opCount ?? result.opCount ?? 0;
      return {
        name: matched.name,
        value: Number(value),
        share: matched.meta?.share ?? 0,
        meta: {
          ...matched.meta,
          type: matched.meta?.type ?? result.nodeType,
          id: matched.meta?.id ?? matched.id ?? result.id ?? result.issuer,
          opCount: Number(value),
          childCount: matched.children?.length ?? matched.meta?.childCount,
          protocol: matched.meta?.protocol ?? result.protocol,
          category: matched.meta?.category ?? result.category,
        },
      };
    }
  }
  return searchResultToSelectedNode(result);
}

function activeTreemapRoot(
  data: ActivityVisualizationResponse | undefined,
  treemapView: TreemapViewId,
  metric: DashboardMetricId,
): TreemapNode | null {
  if (!data) return null;
  const payload =
    metric === "protocol_tvl"
      ? data.treemaps.protocol_tvl
      : metric === "xlm_volume"
        ? data.treemaps[`xlm_${treemapView}` as keyof typeof data.treemaps]
        : metric === "usdc"
          ? data.treemaps[`usdc_${treemapView}` as keyof typeof data.treemaps]
          : metric === "transactions"
            ? data.treemaps[`txn_${treemapView}` as keyof typeof data.treemaps]
            : data.treemaps[treemapView];
  return (payload as TreemapNode | undefined) ?? null;
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [period, setPeriodState] = useState<Period>("1d");
  const [comparePeriod, setComparePeriodState] = useState<Period | null>(null);
  const [treemapView, setTreemapViewState] = useState<TreemapViewId>("events");
  const [metric, setMetricState] = useState<DashboardMetricId>("ops");
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [activeLevelPath, setActiveLevelPath] = useState<TreemapNode[]>([]);
  const [focusRequest, setFocusRequest] = useState<SearchResult | null>(null);
  const pendingPathSegments = useRef<string[] | null>(null);
  const [urlReady, setUrlReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const parsed = parseDashboardUrlSearch(window.location.search);
    const compareParam = new URLSearchParams(
      window.location.search,
    ).get("comparePeriod");
    if (parsed.pathSegments && parsed.pathSegments.length > 0) {
      pendingPathSegments.current = parsed.pathSegments;
    }
    // Defer state updates so hydration does not cascade synchronously in the effect body.
    queueMicrotask(() => {
      if (parsed.period) setPeriodState(parsed.period);
      setComparePeriodState(compareParam as Period | null);
      if (parsed.metric) setMetricState(parsed.metric);
      if (parsed.view) setTreemapViewState(parsed.view);
      setUrlReady(true);
    });
  }, []);

  const handleSetPeriod = useCallback((newPeriod: Period) => {
    setSelectedNode(null);
    setActiveLevelPath([]);
    setFocusRequest(null);
    pendingPathSegments.current = null;
    setPeriodState(newPeriod);
  }, []);

  const handleSetComparePeriod = useCallback(
    (newComparePeriod: Period | null) => {
      setComparePeriodState(newComparePeriod);
    },
    [],
  );

  const handleSetTreemapView = useCallback((newView: TreemapViewId) => {
    setSelectedNode(null);
    setActiveLevelPath([]);
    setFocusRequest(null);
    pendingPathSegments.current = null;
    setTreemapViewState(newView);
  }, []);

  const handleSetMetric = useCallback((newMetric: DashboardMetricId) => {
    setSelectedNode(null);
    setActiveLevelPath([]);
    setFocusRequest(null);
    pendingPathSegments.current = null;
    setMetricState(newMetric);
  }, []);

  const query = useQuery({
    queryKey: ["activity", period],
    queryFn: () => fetchActivity(period),
    staleTime: 60_000,
  });

  const compareQuery = useQuery({
    queryKey: ["activity", "compare", comparePeriod],
    queryFn: () => fetchActivity(comparePeriod as Period),
    enabled: comparePeriod !== null,
    staleTime: 60_000,
  });

  useEffect(() => {
    const segments = pendingPathSegments.current;
    if (!segments || segments.length === 0 || !query.data) return;
    const root = activeTreemapRoot(query.data, treemapView, metric);
    if (!root) return;
    const resolved = resolveDrillPath(root, segments);
    pendingPathSegments.current = null;
    setActiveLevelPath(resolved);
  }, [query.data, treemapView, metric]);

  useEffect(() => {
    if (!urlReady || typeof window === "undefined") return;
    const next = writeDashboardUrlSearch({
      period,
      metric,
      view: treemapView,
      path: activeLevelPath,
      currentSearch: window.location.search,
    });
    const searchParams = new URLSearchParams(next);
    if (comparePeriod) {
      searchParams.set("comparePeriod", comparePeriod);
    } else {
      searchParams.delete("comparePeriod");
    }
    const nextSearch = searchParams.toString();
    const nextUrl = nextSearch ? `?${nextSearch}` : "";
    if (nextUrl !== window.location.search) {
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${nextUrl}`,
      );
    }
  }, [urlReady, period, comparePeriod, metric, treemapView, activeLevelPath]);

  const selectSearchResult = useCallback(
    (result: SearchResult) => {
      setTreemapViewState(result.treemapView);
      setFocusRequest(result);
      setSelectedNode(selectedNodeFromSearch(query.data, result));
    },
    [query.data],
  );

  const value = useMemo(
    () => ({
      period,
      setPeriod: handleSetPeriod,
      comparePeriod,
      setComparePeriod: handleSetComparePeriod,
      treemapView,
      setTreemapView: handleSetTreemapView,
      metric,
      setMetric: handleSetMetric,
      data: query.data,
      isLoading: query.isLoading,
      isError: query.isError,
      isFetching: query.isFetching,
      error: query.error,
      refetch: query.refetch,
      comparisonData: comparePeriod && !compareQuery.isError ? compareQuery.data : undefined,
      comparisonIsLoading: comparePeriod ? compareQuery.isLoading : false,
      comparisonIsError: comparePeriod ? compareQuery.isError : false,
      comparisonIsFetching: comparePeriod ? compareQuery.isFetching : false,
      comparisonError: comparePeriod ? compareQuery.error : null,
      refetchComparison: compareQuery.refetch,
      selectedNode,
      setSelectedNode,
      activeLevelPath,
      setActiveLevelPath,
      focusRequest,
      selectSearchResult,
    }),
    [
      period,
      handleSetPeriod,
      comparePeriod,
      handleSetComparePeriod,
      treemapView,
      handleSetTreemapView,
      metric,
      handleSetMetric,
      query.data,
      query.isLoading,
      query.isError,
      query.isFetching,
      query.error,
      query.refetch,
      compareQuery.data,
      compareQuery.isLoading,
      compareQuery.isError,
      compareQuery.isFetching,
      compareQuery.error,
      compareQuery.refetch,
      selectedNode,
      activeLevelPath,
      focusRequest,
      selectSearchResult,
    ],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within DashboardProvider");
  }
  return context;
}
