import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { ThreeDotMenu } from "@/components/commons/three-dot-menu";
import { ChartNoAxesCombined, Edit, Eye, Trash } from "lucide-react";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import { fmt, PaginatedTable } from "@/components/paginated-table";
import { useTablePollsStore } from "@/stores/table_polls.store";
import { ConfirmDeletePollsModal } from "@/components/modals/table_polls/delete";
import { utcToAdminFormatted } from "@/utils/time";

export default function TrialPollTable({ trialId }: { trialId: string }) {
  const navigate = useNavigate();
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const isDeleting = useTablePollsStore((s) => s.isDeleting);
  const setIsDeleting = useTablePollsStore((s) => s.setIsDeleting);

  const base = endpoints.entities.polls.getPollsByTrialId(trialId);
  // const url = `${base}?page=${page}&pageSize=${pageSize}`;
  const url = `${base}`;
  const { data, isFetching } = useApiQuery(url, { keepPreviousData: true });

  const entries = useMemo(() => data?.data?.data?.entries ?? [], [data]);

  const actions = useCallback(
    (id: string) => [
      {
        name: "View",
        icon: Eye,
        onClick: () =>
          navigate(`/polls/${id}`, {
            state: { isNavigationEditing: false },
          }),
      },
      {
        name: "Edit",
        icon: Edit,
        onClick: () =>
          navigate(`/polls/${id}`, {
            state: { isNavigationEditing: true },
          }),
      },
      {
        name: "Analytics",
        icon: ChartNoAxesCombined,
        onClick: () => navigate(`/analytics/polls/${id}`),
      },
      {
        name: "Delete",
        icon: Trash,
        onClick: () => setIsDeleting([id]),
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
    // { key: "_id", header: "ID", canFilter: true },
    { key: "title", header: "Title", canFilter: true },
    { key: "description", header: "Description", canFilter: true },
    {
      key: "createdAt",
      header: "Created At",
      render: (v: any) => <span>{utcToAdminFormatted(v)}</span>,
    },
    // {
    //   key: "archivedAt",
    //   header: "Archived At",
    //   render: (v: any) => <span>{fmt(v)}</span>,
    // },
    {
      key: "tableOptions",
      header: "...",
      render: (v: any) => <span>{v}</span>,
      isRightAligned: true,
    },
  ] as const;

  if (!data) return null;

  return (
    <>
      <div className="min-h-[80vh] h-[80vh]">
        <PaginatedTable
          title="Polls in this Trial"
          columns={columns}
          tableData={tableData}
          data={data}
          page={page}
          setPage={setPage}
          pageSize={pageSize}
          isFetching={isFetching}
          usingRef={false}
        />
      </div>
      {isDeleting?.length > 0 && <ConfirmDeletePollsModal url={url} />}
    </>
  );
}
