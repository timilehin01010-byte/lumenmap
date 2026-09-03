import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateDelta } from "@/lib/comparison";

describe("calculateDelta", () => {
  it("returns absolute and percent change", () => {
    assert.deepEqual(calculateDelta(100, 125), { absolute: 25, percent: 25 });
  });
  it("uses null percent for a zero baseline", () => {
    assert.deepEqual(calculateDelta(0, 10), { absolute: 10, percent: null });
  });
});
