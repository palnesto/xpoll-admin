import { useMemo, useState } from "react";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import { PaginatedTable } from "@/components/paginated-table";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { assetSpecs } from "@/utils/currency-assets/asset";
import { utcToAdminFormatted } from "@/utils/time";
import { capitalize } from "lodash";

function LegsGrid({ legs }: { legs: any[] }) {
  if (!Array.isArray(legs) || legs.length === 0) return <span>--</span>;

  return (
    <div className="grid grid-cols-2 gap-1">
      {legs.map((leg) => {
        const spec = assetSpecs[leg.assetId as keyof typeof assetSpecs];
        const parentAmount = unwrapString(
          amount({
            op: "toParent",
            assetId: leg.assetId,
            value: leg.amount,
            output: "string",
            trim: true,
            group: true,
          })
        );
        return (
          <div
            key={leg._id}
            className="flex items-center gap-2 rounded border p-1"
            title={spec?.name ?? leg.assetId}
          >
            {/* coin img */}
            {spec?.img ? (
              <img
                src={spec.img}
                alt={spec.parentSymbol}
                className="h-4 w-4 rounded-full object-contain"
              />
            ) : (
              <div className="h-4 w-4 rounded-full bg-muted" />
            )}

            <div className="font-medium text-xs">{parentAmount}</div>
            {/* optional: show raw asset for clarity */}
            {/* <div className="text-[10px] text-muted-foreground">
                {leg.legName || leg.legType}
              </div> */}
          </div>
        );
      })}
    </div>
  );
}

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
  console.log(entries);
  const tableData = useMemo(
    () =>
      entries.map((r: any) => {
        const meta = r.metadata || {};
        // const parentAmountVal = meta.amount
        //   ? unwrapString(
        //       amount({
        //         op: "toParent",
        //         assetId: meta.assetId,
        //         value: meta.amount,
        //         output: "string",
        //         trim: true,
        //         group: false,
        //       })
        //     )
        //   : "--";
        return {
          ...r,
          username: meta.username ?? "Admin",
          action: r.action
            ? r.action === "trial-reward"
              ? capitalize("trail reward")
              : capitalize(r.action)
            : "--",
          // keep legs on the row so the column renderer can use it
          legs: Array.isArray(r.legs) ? r.legs : [],
          createdAt: r.createdAt,
        };
      }),
    [entries]
  );

  const columns = [
    // { key: "_id", header: "ID", canFilter: true },
    { key: "username", header: "Username", canFilter: true },
    { key: "action", header: "Action", canFilter: true },
    // { key: "chain", header: "Chain", canFilter: true },
    {
      key: "legs",
      header: "Amount",
      render: (legs: any[]) => <LegsGrid legs={legs} />,
      canFilter: true,
    },
    {
      key: "createdAt",
      header: "Created At",
      render: (val: any) => <span>{utcToAdminFormatted(val)}</span>,
    },
    // {
    //   key: "archivedAt",
    //   header: "Archived At",
    //   render: (val: any) => <span>{utcToAdminFormatted(val)}</span>,
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
