import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TreemapNode } from "@/lib/types";
import {
  decodeDrillPathParam,
  encodeDrillPath,
  isValidMetric,
  parseDashboardUrlSearch,
  resolveDrillPath,
  writeDashboardUrlSearch,
} from "./dashboard-url-state";

const sampleRoot: TreemapNode = {
  name: "Network Activity",
  children: [
    {
      id: "soroban",
      name: "Soroban",
      value: 100,
      children: [
        {
          id: "invoke_host_function",
          name: "invoke_host_function",
          value: 80,
        },
      ],
    },
    {
      name: "Payments",
      value: 50,
    },
  ],
};

describe("dashboard URL state", () => {
  it("validates known metrics only", () => {
    assert.equal(isValidMetric("ops"), true);
    assert.equal(isValidMetric("usdc"), true);
    assert.equal(isValidMetric("protocol_tvl"), true);
    assert.equal(isValidMetric("tvl"), false);
    assert.equal(isValidMetric(null), false);
  });

  it("parses period and metric from search params", () => {
    const parsed = parseDashboardUrlSearch(
      "?period=7d&metric=xlm_volume&view=actors",
    );
    assert.equal(parsed.period, "7d");
    assert.equal(parsed.metric, "xlm_volume");
    assert.equal(parsed.view, "actors");
  });

  it("ignores invalid period and metric values", () => {
    const parsed = parseDashboardUrlSearch("?period=90d&metric=nope");
    assert.equal(parsed.period, undefined);
    assert.equal(parsed.metric, undefined);
  });

  it("encodes and restores drill path segments", () => {
    const path = resolveDrillPath(sampleRoot, [
      "soroban",
      "invoke_host_function",
    ]);
    assert.equal(path.length, 2);
    assert.equal(path[1].name, "invoke_host_function");

    const encoded = encodeDrillPath(path);
    assert.equal(encoded, "soroban/invoke_host_function");
    assert.deepEqual(decodeDrillPathParam(encoded), [
      "soroban",
      "invoke_host_function",
    ]);
  });

  it("stops restoring at the first missing path segment", () => {
    const path = resolveDrillPath(sampleRoot, ["soroban", "missing"]);
    assert.equal(path.length, 1);
    assert.equal(path[0].name, "Soroban");
  });

  it("writes period, metric, view, and path into the query string", () => {
    const path = resolveDrillPath(sampleRoot, ["Payments"]);
    const search = writeDashboardUrlSearch({
      period: "30d",
      metric: "transactions",
      view: "events",
      path,
      currentSearch: "?utm=keep",
    });
    assert.match(search, /period=30d/);
    assert.match(search, /metric=transactions/);
    assert.match(search, /view=events/);
    assert.match(search, /path=Payments/);
    assert.match(search, /utm=keep/);
  });

  it("round-trips comparison period state", () => {
    const search = writeDashboardUrlSearch({
      period: "1d",
      comparePeriod: "7d",
      metric: "ops",
      view: "events",
      path: [],
    });
    assert.equal(parseDashboardUrlSearch(search).comparePeriod, "7d");
  });
});
