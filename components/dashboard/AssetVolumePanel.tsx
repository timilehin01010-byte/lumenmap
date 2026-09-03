"use client";

import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, truncateAddress } from "@/lib/utils";

export function AssetVolumePanel() {
  const { data, setSelectedNode } = useDashboard();
  const rows = data?.assetVolumes ?? [];
  const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment volume by asset</CardTitle>
        <p className="text-xs text-zinc-400">
          Raw native units; values are not converted across assets. Issuers
          remain distinct.
        </p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-400">
            No asset payment volume is available for this period.
          </p>
        ) : (
          <div
            className="flex min-h-40 flex-wrap gap-2"
            aria-label="Payment volume assets"
          >
            {rows.map((row) => {
              const issuer =
                row.asset.type === "issued" ? row.asset.issuer : undefined;
              const amount = Number(row.amount);
              const share = total > 0 ? (amount / total) * 100 : 0;
              return (
                <button
                  key={`${row.asset.code}:${issuer ?? "native"}`}
                  type="button"
                  className="min-h-24 min-w-40 flex-1 rounded-lg border border-cyan-900/60 bg-cyan-950/40 p-3 text-left hover:border-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  style={{ flexGrow: Math.max(1, Math.sqrt(amount)) }}
                  onClick={() =>
                    setSelectedNode({
                      name: issuer
                        ? `${row.asset.code} · ${truncateAddress(issuer)}`
                        : "Native XLM",
                      value: amount,
                      share,
                      meta: {
                        type: "entity",
                        assetCode: row.asset.code,
                        assetIssuer: issuer,
                        assetAmount: row.amount,
                        opCount: row.opCount,
                      },
                    })
                  }
                >
                  <span className="block font-semibold text-white">
                    {row.asset.code}
                  </span>
                  <span className="block font-mono text-sm text-cyan-200">
                    {formatNumber(amount)} {row.asset.code}
                  </span>
                  <span className="mt-1 block font-mono text-[10px] text-zinc-500">
                    {issuer ? truncateAddress(issuer) : "native"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
