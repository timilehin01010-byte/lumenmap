import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildHeatmap } from "@/lib/hubble/activity";

describe("buildHeatmap", () => {
  it("fills all 168 UTC hour-of-week buckets", () => {
    const result = buildHeatmap([
      { day_of_week: 2, hour_of_day: 14, tx_count: 7, op_count: 11 },
    ]);
    assert.equal(result.buckets.length, 168);
    assert.deepEqual(result.buckets[38], {
      dayOfWeek: 1,
      hourOfDay: 14,
      transactions: 7,
      operations: 11,
    });
    assert.deepEqual(result.buckets[0], {
      dayOfWeek: 0,
      hourOfDay: 0,
      transactions: 0,
      operations: 0,
    });
  });
});
