import { useMemo, useState } from "react";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import { fmt, PaginatedTable } from "@/components/paginated-table";

export default function SellIntent() {
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const url = `${endpoints.entities.assetLedger.all}?page=${page}&pageSize=${pageSize}`;
  const { data, isFetching } = useApiQuery(url, { keepPreviousData: true });
  console.log("data", data);
  const entries = useMemo(() => data?.data?.data?.items ?? [], [data]);

  const tableData = useMemo(
    () =>
      entries.map((r: any) => ({
        ...r,
      })),
    [entries]
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
}
