import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { ThreeDotMenu } from "@/components/commons/three-dot-menu";
import { Eye, Trash } from "lucide-react";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import { PaginatedTable } from "@/components/paginated-table";

import { useTablePollsStore } from "@/stores/table_polls.store";
import { ConfirmDeletePollsModal } from "@/components/modals/table_polls/delete";
import { utcToAdminFormatted } from "@/utils/time";

export default function Polls() {
  const navigate = useNavigate();

  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const isDeleting = useTablePollsStore((s) => s.isDeleting);
  const setIsDeleting = useTablePollsStore((s) => s.setIsDeleting);

  const url = `${endpoints.entities.polls.all}?page=${page}&pageSize=${pageSize}`;
  const { data, isFetching } = useApiQuery(url, { keepPreviousData: true });
  const entries = useMemo(() => data?.data?.data?.entries ?? [], [data]);
  const actions = useCallback(
    (id: string) => [
      {
        name: "View",
        icon: Eye,
        onClick: () => navigate(`/polls/${id}`),
      },
      {
        name: "Delete",
        icon: Trash,
        onClick: () => {
          setIsDeleting([id]);
        },
        separatorBefore: true,
      },
    ],
    [navigate, setIsDeleting]
  );

  const tableData = useMemo(
    () =>
      entries.map((r: any) => {
        const createdBy =
          r.externalAuthor == null && r.internalAuthor != null
            ? "Admin"
            : r.internalAuthor == null && r.externalAuthor != null
            ? "User"
            : "—";

        return {
          ...r,
          createdBy,
          tableOptions: <ThreeDotMenu actions={actions(r._id)} />,
        };
      }),
    [entries, actions]
  );

  const columns = [
    { key: "title", header: "Title", canFilter: true },
    {
      key: "createdBy",
      header: "Created By",
      canFilter: true,
      render: (val: any) => (
        <span
          className={
            val === "Admin"
              ? "inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700"
              : val === "User"
              ? "inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700"
              : "text-muted-foreground"
          }
        >
          {val}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created At",
      render: (val: any) => <span>{utcToAdminFormatted(val)}</span>,
    },
    {
      key: "archivedAt",
      header: "Archived At",
      render: (val: any) => <span>{utcToAdminFormatted(val)}</span>,
    },
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
        title="Polls"
        onCreate={() => navigate("/polls/create")}
        createButtonText="Create Poll"
        columns={columns}
        tableData={tableData}
        data={data}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        isFetching={isFetching}
      />

      {isDeleting?.length > 0 && <ConfirmDeletePollsModal url={url} />}
    </div>
  );
}
