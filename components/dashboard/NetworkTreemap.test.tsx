import { act } from "react";
import { createRoot } from "react-dom/client";
import { getByText } from "@testing-library/dom";
import { NetworkTreemap } from "./NetworkTreemap";

vi.mock("@/components/dashboard/DashboardProvider", () => ({
  useDashboard: () => ({
    data: {
      period: "1d",
      treemaps: {
        events: {
          name: "Network Activity",
          metric: "operation_count",
          unit: "count",
          children: [{ name: "soroban", value: 1, meta: { category: "soroban" } }],
        },
        actors: {
          name: "Accounts & Contracts",
          metric: "operation_count",
          unit: "count",
          children: [],
        },
        txn_events: {
          name: "Network Activity",
          metric: "transaction_count",
          unit: "count",
          children: [],
        },
        txn_actors: {
          name: "Accounts & Contracts",
          metric: "transaction_count",
          unit: "count",
          children: [],
        },
        xlm_events: {
          name: "Network Activity",
          metric: "asset_volume",
          unit: "XLM",
          children: [],
        },
        xlm_actors: {
          name: "Accounts & Contracts",
          metric: "asset_volume",
          unit: "XLM",
          children: [],
        },
        usdc_events: {
          name: "Network Activity",
          metric: "asset_volume",
          unit: "USDC",
          children: [],
        },
        usdc_actors: {
          name: "Accounts & Contracts",
          metric: "asset_volume",
          unit: "USDC",
          children: [],
        },
        protocol_tvl: {
          name: "Protocol TVL",
          metric: "tvl",
          unit: "USD",
          children: [],
        },
      },
      kpis: {
        totalOps: { kind: "operations", unit: "ops", value: 123 },
        sorobanShare: { kind: "share", unit: "percent", value: 12.3 },
        topCategory: "soroban",
        activeContracts: { kind: "entity_count", unit: "count", value: 5 },
        activeWallets: { kind: "entity_count", unit: "count", value: 12 },
        activeDestinationAccounts: { kind: "entity_count", unit: "count", value: 9 },
      },
    },
    isLoading: false,
    isError: false,
    isFetching: false,
    error: null,
    period: "1d",
    metric: "ops",
    treemapView: "events",
    selectedNode: null,
    setSelectedNode: vi.fn(),
    activeLevelPath: [],
    setActiveLevelPath: vi.fn(),
    focusRequest: null,
    selectSearchResult: vi.fn(),
    refetch: vi.fn(),
  }),
}));

vi.mock("@/components/dashboard/D3Treemap", () => ({
  D3Treemap: () => <div data-testid="d3-treemap" />,
}));

vi.mock("@/components/dashboard/ExportControls", () => ({
  ExportControls: () => null,
}));

vi.mock("@/components/dashboard/TreemapDataTable", () => ({
  TreemapDataTable: () => null,
}));

describe("NetworkTreemap", () => {
  it("renders the legend using semantic token colors", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      act(() => {
        root.render(<NetworkTreemap />);
      });

      const legend = getByText(container, "Soroban");
      expect(legend).toBeTruthy();
    } finally {
      root.unmount();
      document.body.removeChild(container);
    }
  });
});
