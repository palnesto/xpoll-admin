import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { PaginatedTable, fmt } from "@/components/paginated-table";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import { ThreeDotMenu } from "@/components/commons/three-dot-menu";
import { Pencil, Archive } from "lucide-react";

export default function SlugsTable() {
  const navigate = useNavigate();

  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [includeArchived] = useState<boolean>(true); // or false if you only want active

  // Build list URL (same pattern as your other tables)
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    includeArchived: String(includeArchived),
  });

  const url = `${endpoints.entities.slug.all}?${params.toString()}`;
  const { data, isFetching } = useApiQuery(url, { keepPreviousData: true });

  const entries = useMemo(() => data?.data?.data?.entries ?? [], [data]);

  const actions = useCallback(
    (id: string) => [
      {
        name: "Edit",
        icon: Pencil,
        onClick: () => {}, // your edit screen/route
      },
      {
        name: "Archive",
        icon: Archive,
        onClick: () => {}, // or open a confirm modal
        separatorBefore: true,
      },
    ],
    []
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
    { key: "name", header: "Name", canFilter: true },
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
    {
      key: "tableOptions",
      header: "...",
      render: (v: any) => <span>{v}</span>,
      isRightAligned: true,
    },
  ] as const;

  return (
    <div className="space-y-3">
      {/* Optional search input that feeds ?q= */}

      <PaginatedTable
        title="Slugs"
        // createButtonText="Create Slug"
        // onCreate={() => navigate("/slugs/create")}
        columns={columns}
        tableData={tableData}
        data={data}
        isFetching={isFetching}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
      />
    </div>
  );
}
