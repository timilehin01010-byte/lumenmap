import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapAssetPaymentVolumeRows } from "@/lib/hubble/queries";

describe("mapAssetPaymentVolumeRows", () => {
  it("keeps same-code assets with different issuers separate", () => {
    const rows = mapAssetPaymentVolumeRows([
      { asset_type: "native", amount: "12", op_count: 2 },
      {
        asset_type: "credit_alphanum4",
        asset_code: "USDC",
        asset_issuer: "GAAA",
        amount: "5",
        op_count: 1,
      },
      {
        asset_type: "credit_alphanum4",
        asset_code: "USDC",
        asset_issuer: "GBBB",
        amount: "7",
        op_count: 3,
      },
    ]);
    assert.equal(rows.length, 3);
    assert.deepEqual(
      rows.map((row) => row.asset),
      [
        { type: "native", code: "XLM" },
        { type: "issued", code: "USDC", issuer: "GAAA" },
        { type: "issued", code: "USDC", issuer: "GBBB" },
      ],
    );
  });
});
