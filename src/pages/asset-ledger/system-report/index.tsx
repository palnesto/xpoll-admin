import { useMemo } from "react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { assetSpecs, AssetType } from "@/utils/currency-assets/asset";
import SystemReportSkeleton from "@/utils/SystemReportSkeleton";
import Actions from "@/components/allActions";

type RoleKey = "treasury" | "exchange" | "poll-funds";

type AssetMeta = {
  symbol: string;
  name: string;
  decimal: number;
  leastCountOf: string;
  img: string;
  parent: string;
};

type RoleBalanceBlock = {
  role: RoleKey | string;
  accountId: string;
  balances: Record<string, number>;
  meta: Record<string, AssetMeta>;
};

type SystemReport = {
  generatedAt: string;
  balances: {
    treasury?: RoleBalanceBlock;
    exchange?: RoleBalanceBlock;
    "poll-funds"?: RoleBalanceBlock;
    summary?: {
      byAsset: Record<string, number>;
    };
  };
  pollFundingNeeds?: {
    byAsset: Record<
      string,
      {
        outstanding: number;
        balance: number;
        shortfall: number;
        surplus: number;
      }
    >;
    totals: {
      outstanding: number;
      balance: number;
      shortfall: number;
      surplus: number;
    };
    mintPlan: Array<{ assetId: string; amount: number }>;
  };
};

const ROLE_ORDER: RoleKey[] = ["treasury", "exchange", "poll-funds"];
const ROLE_LABEL: Record<RoleKey, string> = {
  treasury: "Treasury",
  exchange: "Exchange",
  "poll-funds": "Poll Funds",
};

function formatTime(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function TinyId({ id }: { id: string }) {
  const short = id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
  return (
    <span className="font-mono text-xs text-muted-foreground">{short}</span>
  );
}

function AssetRow({
  id,
  amountBase,
  meta,
}: {
  id: string;
  amountBase: number;
  meta?: AssetMeta;
}) {
  // format from base → parent
  const valueStr = unwrapString(
    amount({
      op: "toParent",
      assetId: id as AssetType,
      value: amountBase,
      output: "string",
      trim: true,
      group: true,
    }),
    "0"
  );

  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        {meta?.img ? (
          <img src={meta.img} alt={meta?.symbol ?? id} className="h-5" />
        ) : (
          <div className="h-5 w-5 rounded bg-muted" />
        )}
        <div className="truncate">
          <div className="text-sm font-medium truncate uppercase">
            {meta?.parent ?? id}{" "}
            <span className="text-muted-foreground">
              ({meta?.symbol ?? id})
            </span>
          </div>
          {/* <div className="text-xs text-muted-foreground">
            {meta?.leastCountOf
              ? `Least count of ${meta.leastCountOf}`
              : "\u00A0"}
          </div> */}
        </div>
      </div>
      <div className="text-sm font-semibold tabular-nums">{valueStr}</div>
    </div>
  );
}

function RoleCard({ block }: { block: RoleBalanceBlock }) {
  const entries = Object.entries(block.balances ?? {});
  return (
    <Card className="bg-sidebar rounded-2xl">
      <CardHeader>
        <CardTitle className="flex text-lg font-semibold items-center justify-between">
          <span>{ROLE_LABEL[block.role as RoleKey] ?? block.role}</span>
          <TinyId id={block.accountId} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.length === 0 ? (
          <div className="text-sm text-muted-foreground">No balances</div>
        ) : (
          entries.map(([assetId, amt]) => {
            const meta = assetSpecs[assetId as AssetType];
            return (
              <AssetRow
                key={assetId}
                id={assetId}
                amountBase={amt}
                meta={meta}
              />
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function SummaryCard({
  byAsset,
  title = "Summary (All System Accounts)",
}: {
  byAsset?: Record<string, number>;
  title?: string;
}) {
  const rows = Object.entries(byAsset ?? {});
  if (!rows.length) return null;

  return (
    <Card className="bg-sidebar rounded-2xl">
      <CardHeader className="text-lg">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map(([assetId, amt]) => {
          const valueStr = unwrapString(
            amount({
              op: "toParent",
              assetId: assetId as AssetType,
              value: amt,
              output: "string",
              trim: true,
              group: true,
            }),
            "0"
          );
          const meta = assetSpecs[assetId as AssetType];
          return (
            <div
              key={assetId}
              className="flex items-center justify-between py-1.5"
            >
              <div className="text-sm font-medium uppercase">
                {meta?.parent ?? assetId} ({meta?.symbol ?? assetId})
              </div>
              <div className="text-sm font-semibold tabular-nums">
                {valueStr}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function FundingNeedsCard({
  needs,
}: {
  needs?: SystemReport["pollFundingNeeds"];
}) {
  if (!needs) return null;
  const rows = Object.entries(needs.byAsset ?? {});
  return (
    <Card className="bg-sidebar rounded-2xl">
      <CardHeader className="text-lg">
        <CardTitle>Poll Funding Needs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length ? (
          <div className="space-y-2">
            {rows.map(([assetId, v]) => {
              const balanceStr = unwrapString(
                amount({
                  op: "toParent",
                  assetId: assetId as AssetType,
                  value: v.balance,
                  output: "string",
                  trim: true,
                  group: true,
                }),
                "0"
              );
              const outstandingStr = unwrapString(
                amount({
                  op: "toParent",
                  assetId: assetId as AssetType,
                  value: v.outstanding,
                  output: "string",
                  trim: true,
                  group: true,
                }),
                "0"
              );
              const shortfallStr = unwrapString(
                amount({
                  op: "toParent",
                  assetId: assetId as AssetType,
                  value: v.shortfall,
                  output: "string",
                  trim: true,
                  group: true,
                }),
                "0"
              );
              const surplusStr = unwrapString(
                amount({
                  op: "toParent",
                  assetId: assetId as AssetType,
                  value: v.surplus,
                  output: "string",
                  trim: true,
                  group: true,
                }),
                "0"
              );
              const meta = assetSpecs[assetId as AssetType];

              return (
                <div key={assetId} className="py-1.5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium uppercase">
                      {meta?.parent ?? assetId} ({meta?.symbol ?? assetId})
                    </div>
                    <div className="text-xs text-muted-foreground">
                      outstanding:{" "}
                      <span className="font-medium">{outstandingStr}</span> ·
                      balance: <span className="font-medium">{balanceStr}</span>
                    </div>
                  </div>
                  <div className="text-xs">
                    shortfall:{" "}
                    <span className="font-semibold text-red-600">
                      {shortfallStr}
                    </span>{" "}
                    {v.surplus > 0 ? (
                      <>
                        · surplus:{" "}
                        <span className="font-semibold text-green-600">
                          {surplusStr}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No funding needs.</div>
        )}

        <Separator />

        <div className="space-y-2">
          <div className="text-sm font-semibold">Mint Plan</div>
          {needs.mintPlan?.length ? (
            <ul className="space-y-1">
              {needs.mintPlan.map((m, i) => {
                const amtStr = unwrapString(
                  amount({
                    op: "toParent",
                    assetId: m.assetId as AssetType,
                    value: m.amount,
                    output: "string",
                    trim: true,
                    group: true,
                  }),
                  "0"
                );
                return (
                  <li
                    key={`${m.assetId}-${i}`}
                    className="flex justify-between text-sm"
                  >
                    <span>{m.assetId}</span>
                    <span className="font-semibold tabular-nums">{amtStr}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-sm text-muted-foreground">
              No minting suggested.
            </div>
          )}
        </div>

        {/* <Separator /> */}

        {/* <div className="text-xs text-muted-foreground">
          Totals — outstanding:{" "}
          <span className="font-medium">
            {unwrapString(
              amount({
                op: "toParent",
                assetId: ASSETS.X_POLL, // or choose dynamically if mixed
                value: needs.totals.outstanding,
                output: "string",
                trim: true,
                group: true,
              }),
              "0"
            )}
          </span>{" "}
          · balance:{" "}
          <span className="font-medium">
            {unwrapString(
              amount({
                op: "toParent",
                assetId: ASSETS.X_POLL,
                value: needs.totals.balance,
                output: "string",
                trim: true,
                group: true,
              }),
              "0"
            )}
          </span>{" "}
          · shortfall:{" "}
          <span className="font-medium">
            {unwrapString(
              amount({
                op: "toParent",
                assetId: ASSETS.X_POLL,
                value: needs.totals.shortfall,
                output: "string",
                trim: true,
                group: true,
              }),
              "0"
            )}
          </span>{" "}
          · surplus:{" "}
          <span className="font-medium">
            {unwrapString(
              amount({
                op: "toParent",
                assetId: ASSETS.X_POLL,
                value: needs.totals.surplus,
                output: "string",
                trim: true,
                group: true,
              }),
              "0"
            )}
          </span>
        </div> */}
      </CardContent>
    </Card>
  );
}

export default function SystemReportPage() {
  const route =
    (endpoints as any)?.entities?.assetLedger?.systemReport ??
    "/internal/asset-ledger/system-report";

  const { data, isFetching, refetch } = useApiQuery(route, {
    keepPreviousData: true,
  });

  const report: SystemReport | undefined = useMemo(() => {
    const payload = (data as any)?.data ?? data;
    return payload?.data ?? payload;
  }, [data]);

  const generatedAt = report?.generatedAt;

  const blocks: RoleBalanceBlock[] = useMemo(() => {
    const b = report?.balances ?? {};
    return ROLE_ORDER.map((k) => (b as any)?.[k]).filter(
      Boolean
    ) as RoleBalanceBlock[];
  }, [report]);

  const summary = report?.balances?.summary?.byAsset;
  if (isFetching) return <SystemReportSkeleton />;
  return (
    <div className="p-4 space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">System Report</h1>
          {generatedAt ? (
            <div className="text-xs text-muted-foreground">
              Generated at:{" "}
              <span className="font-medium">{formatTime(generatedAt)}</span>
            </div>
          ) : null}
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
      <Actions />
      {/* Role cards */}
      <div className="grid gap-7 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {isFetching && !report ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Loading…</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Loading…</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Loading…</CardTitle>
              </CardHeader>
            </Card>
          </>
        ) : blocks.length ? (
          blocks.map((blk) => <RoleCard key={blk.role} block={blk} />)
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No data</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              System report is empty.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary + Funding Needs */}
      <div className="grid gap-7 grid-cols-1 lg:grid-cols-2">
        <SummaryCard byAsset={summary} />
        <FundingNeedsCard needs={report?.pollFundingNeeds} />
      </div>
    </div>
  );
}
