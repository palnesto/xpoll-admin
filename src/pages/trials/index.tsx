import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { ThreeDotMenu } from "@/components/commons/three-dot-menu";
import { Eye, Trash } from "lucide-react";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import { fmt, PaginatedTable } from "@/components/paginated-table";
import { useTableTrialsStore } from "@/stores/table_trials.store";
import { ConfirmDeleteTrialPollsModal } from "@/components/modals/table_trials/delete";

export default function Trials() {
  const navigate = useNavigate();

  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const isDeleting = useTableTrialsStore((s) => s.isDeleting);
  const setIsDeleting = useTableTrialsStore((s) => s.setIsDeleting);

  const url = `${endpoints.entities.trials.all}?page=${page}&pageSize=${pageSize}`;
  const { data, isFetching } = useApiQuery(url, { keepPreviousData: true });

  const entries = useMemo(() => data?.data?.data?.entries ?? [], [data]);

  const actions = useCallback(
    (id: string) => [
      {
        name: "View",
        icon: Eye,
        onClick: () => navigate(`/trials/${id}`),
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
      entries.map((r: any) => ({
        ...r,
        tableOptions: <ThreeDotMenu actions={actions(r._id)} />,
      })),
    [entries, actions]
  );

  const columns = [
    { key: "_id", header: "ID", canFilter: true },
    { key: "title", header: "Title", canFilter: true },
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
    <div>
      <PaginatedTable
        title="Trials"
        onCreate={() => navigate("/trials/create")}
        createButtonText="Create Trial"
        columns={columns}
        tableData={tableData}
        data={data}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        isFetching={isFetching}
      />

      {isDeleting?.length > 0 && <ConfirmDeleteTrialPollsModal url={url} />}
    </div>
  );
}
