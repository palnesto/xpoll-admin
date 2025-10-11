import { useMemo, useState, useCallback } from "react";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { ThreeDotMenu } from "@/components/commons/three-dot-menu";
import { ArchiveRestore, ArchiveX } from "lucide-react";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import { fmt, PaginatedTable } from "@/components/paginated-table";
import { useTableSellIntentStore } from "@/stores/table_sell_intent";
import { ApproveSellIntentModal } from "@/components/modals/asset_ledgers/sell_intent/approve";
import { RejectSellIntentModal } from "@/components/modals/asset_ledgers/sell_intent/reject";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { generateStatus } from "../sell-intent";
import { assetSpecs } from "@/utils/currency-assets/asset";

export default function SellIntent() {
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const isAcecpting = useTableSellIntentStore((s) => s.isAccepting);
  const setIsAccepting = useTableSellIntentStore((s) => s.setIsAccepting);
  const isRejecting = useTableSellIntentStore((s) => s.isRejecting);
  const setIsRejecting = useTableSellIntentStore((s) => s.setIsRejecting);

  const url = `${endpoints.entities.assetLedger.sellIntentAdmin}?page=${page}&pageSize=${pageSize}&status=PENDING`;
  const { data, isFetching } = useApiQuery(url, { keepPreviousData: true });

  const entries = useMemo(() => data?.data?.data?.items ?? [], [data]);
  const actions = useCallback(
    (id: string) => [
      {
        name: "Approve",
        icon: ArchiveRestore,
        onClick: () => {
          setIsAccepting([id]);
        },
      },
      {
        name: "Reject",
        icon: ArchiveX,
        onClick: () => {
          setIsRejecting([id]);
        },
        separatorBefore: true,
      },
    ],
    [setIsAccepting, setIsRejecting]
  );

  const tableData = useMemo(
    () =>
      entries.map((r: any) => {
        console.log("r", r);
        const intentLeg = r.legs?.find((l) => {
          return l?.legType === "intent-amount";
        });
        const status = "PENDING";

        const parentAmountVal = unwrapString(
          amount({
            op: "toParent",
            assetId: intentLeg?.assetId,
            value: intentLeg?.amount,
            output: "string",
            trim: true,
            group: false,
          })
        );
        return {
          ...r,
          username: r.metadata?.username,
          walletAddress: r.metadata?.walletAddress,
          chain: r.metadata?.chain,
          assetId:
            assetSpecs[intentLeg?.assetId]?.parentSymbol ?? intentLeg?.assetId,
          parentAmountVal,
          status: generateStatus(status),
          tableOptions: <ThreeDotMenu actions={actions(r._id)} />,
        };
      }),
    [entries, actions]
  );

  console.log("tableData", tableData);

  const columns = [
    // { key: "_id", header: "ID", canFilter: true },
    { key: "username", header: "Username", canFilter: true },
    { key: "walletAddress", header: "Wallet Address", canFilter: true },
    { key: "chain", header: "Chain", canFilter: true },
    // { key: "assetId", header: "Asset ID", canFilter: true },
    { key: "parentAmountVal", header: "Amount", canFilter: true },
    { key: "status", header: "Status", canFilter: true },
    // { key: "action", header: "Action", canFilter: true },
    {
      key: "createdAt",
      header: "Created At",
      render: (val: any) => <span>{fmt(val)}</span>,
    },
    // {
    //   key: "archivedAt",
    //   header: "Archived At",
    //   render: (val: any) => <span>{fmt(val)}</span>,
    // },
    {
      key: "tableOptions",
      header: "...",
      render: (v: any) => <span>{v}</span>,
      isRightAligned: true,
    },
  ] as const;

  return (
    <div>
      <PaginatedTable
        title="Sell Intent (Pending)"
        columns={columns}
        tableData={tableData}
        data={data}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        isFetching={isFetching}
      />

      {isAcecpting?.length > 0 && (
        <ApproveSellIntentModal
          ids={isAcecpting}
          onClose={() => setIsAccepting([])}
          invalidateKey={url}
        />
      )}

      {isRejecting?.length > 0 && (
        <RejectSellIntentModal
          ids={isRejecting}
          onClose={() => setIsRejecting([])}
          invalidateKey={url}
        />
      )}
    </div>
  );
}
