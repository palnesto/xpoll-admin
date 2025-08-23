import { useMemo, useState, useCallback } from "react";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { ThreeDotMenu } from "@/components/commons/three-dot-menu";
import { ArchiveRestore, ArchiveX } from "lucide-react";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import { fmt, PaginatedTable } from "@/components/paginated-table";
import { useTableSellIntentStore } from "@/stores/table_sell_intent";

export default function SellIntent() {
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const isAcecpting = useTableSellIntentStore((s) => s.isAccepting);
  const setIsAccepting = useTableSellIntentStore((s) => s.setIsAccepting);
  const isRejecting = useTableSellIntentStore((s) => s.isRejecting);
  const setIsRejecting = useTableSellIntentStore((s) => s.setIsRejecting);

  const url = `${endpoints.entities.assetLedger.sellRejectOrder}?page=${page}&pageSize=${pageSize}`;
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
      entries.map((r: any) => ({
        ...r,
        tableOptions: <ThreeDotMenu actions={actions(r._id)} />,
      })),
    [entries, actions]
  );

  const columns = [
    { key: "_id", header: "ID", canFilter: true },
    { key: "action", header: "Action", canFilter: true },
    {
      key: "createdAt",
      header: "Created At",
      render: (val: any) => <span>{fmt(val)}</span>,
    },
    {
      key: "archivedAt",
      header: "Archived At",
      render: (val: any) => <span>{fmt(val)}</span>,
    },
  ] as const;

  return (
    <div>
      <PaginatedTable
        title="Sell Intent Rejected"
        columns={columns}
        tableData={tableData}
        data={data}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        isFetching={isFetching}
      />
    </div>
  );
}
