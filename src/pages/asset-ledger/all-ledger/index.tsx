import { useMemo, useState } from "react";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import { fmt, PaginatedTable } from "@/components/paginated-table";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { assetSpecs } from "@/utils/currency-assets/asset";

export default function AllLedgerPage() {
  return <AllLedgerTable />;
}

export const AllLedgerTable = () => {
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const url = `${endpoints.entities.assetLedger.all}?page=${page}&pageSize=${pageSize}`;
  const { data, isFetching } = useApiQuery(url, { keepPreviousData: true });

  // Items already read from the correct location
  const entries = useMemo(() => data?.data?.data?.items ?? [], [data]);

  const tableData = useMemo(
    () =>
      entries.map((r: any) => {
        const meta = r.metadata || {};
        const parentAmountVal = meta.amount
          ? unwrapString(
              amount({
                op: "toParent",
                assetId: meta.assetId,
                value: meta.amount,
                output: "string",
                trim: true,
                group: false,
              })
            )
          : "--";
        return {
          ...r,
          username: meta.username ?? "Admin",
          chain: meta.chain ?? "--",
          assetId:
            assetSpecs[meta.assetId]?.parentSymbol ?? meta.assetId ?? "—",
          parentAmountVal,
        };
      }),
    [entries]
  );

  const columns = [
    // { key: "_id", header: "ID", canFilter: true },
    { key: "username", header: "Username", canFilter: true },
    { key: "action", header: "Action", canFilter: true },
    { key: "chain", header: "Chain", canFilter: true },
    {
      key: "parentAmountVal",
      header: "Amount",
      canFilter: true,
    },
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
  ] as const;

  console.log("data", { page, data });
  return (
    <div>
      <PaginatedTable
        title="All Ledgers"
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
};
