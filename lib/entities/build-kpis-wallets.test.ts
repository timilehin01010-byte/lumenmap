import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildKpis } from "@/lib/entities/build-treemap";
import { getFixtureActivityData } from "@/lib/fixtures/activity";
import {
  getFixtureActiveDestinationCount,
  getFixtureActiveWalletCount,
} from "@/lib/fixtures/timeseries";
import type { CategoryRow } from "@/lib/types";

function category(op_count: number): CategoryRow {
  return { type_string: "payment", op_count };
}

describe("active wallet and destination KPI wiring", () => {
  test("maps source account rows into activeWallets", () => {
    const kpis = buildKpis([category(100)], [], [{ active_accounts: 4321 }], 0, 987);
    assert.equal(kpis.activeWallets.value, 4321);
    assert.equal(kpis.activeWallets.kind, "entity_count");
  });

  test("maps destination count into activeDestinationAccounts", () => {
    const kpis = buildKpis([category(100)], [], [{ active_accounts: 100 }], 0, 654);
    assert.equal(kpis.activeDestinationAccounts.value, 654);
  });

  test("returns zero for empty source and destination periods", () => {
    const kpis = buildKpis([category(0)], [], [], 0, 0);
    assert.equal(kpis.activeWallets.value, 0);
    assert.equal(kpis.activeDestinationAccounts.value, 0);
  });

  test("fixture mode exposes deterministic wallet KPI values", () => {
    const data = getFixtureActivityData("7d");
    assert.equal(data.kpis.activeWallets.value, getFixtureActiveWalletCount("7d"));
    assert.equal(
      data.kpis.activeDestinationAccounts.value,
      getFixtureActiveDestinationCount("7d"),
    );
    assert.ok(data.timeseries);
    assert.ok(data.timeseries!.buckets.length > 0);
  });
});
