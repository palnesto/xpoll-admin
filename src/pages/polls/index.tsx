import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useTablePollsStore } from "@/stores/table_polls.store";
import { ThreeDotMenu } from "@/components/commons/three-dot-menu";
import { TablePage } from "@/components/table-page"; // shows the rows we give it (no local pagination)
import { DeleteTablePollsModal } from "@/domains/table_polls/modals/delete";
import { Edit, Trash, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE } from "@/constants";

type PollRow = {
  _id: string;
  title: string;
  createdAt?: string;
  archivedAt?: string | null;
};

type Meta = {
  total: number; // total number of records across all pages
  page: number; // 1-based page index the server returned
  pageSize: number; // page size the server used
};

export default function Polls() {
  const navigate = useNavigate();
  const isDeleting = useTablePollsStore((s) => s.isDeleting);
  const setIsDeleting = useTablePollsStore((s) => s.setIsDeleting);

  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const { data, isFetching } = useApiQuery(
    `${endpoints.entities.polls.all}?page=${page}&pageSize=${pageSize}`,
    { keepPreviousData: true }
  );
  const entries: PollRow[] = useMemo(
    () => data?.data?.data?.entries ?? [],
    [data]
  );

  const actions = useCallback(
    (id: string) => [
      {
        name: "Edit",
        icon: Edit,
        onClick: () => navigate(`/polls/${id}/edit`),
      },
      {
        name: "Delete",
        icon: Trash,
        onClick: () => setIsDeleting(id),
        separatorBefore: true,
      },
    ],
    [navigate, setIsDeleting]
  );

  const tableData = useMemo(
    () =>
      entries.map((r) => ({
        ...r,
        tableOptions: <ThreeDotMenu actions={actions(r._id)} />,
      })),
    [entries, actions]
  );

  const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString() : "-");

  const columns = [
    { key: "_id", header: "ID" },
    { key: "title", header: "Title" },
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
      {isDeleting && <DeleteTablePollsModal />}
      <PaginatedTable
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

const PaginatedTable = ({
  columns,
  tableData,
  data,
  isFetching,
  page,
  setPage,
  pageSize,
}: {
  columns: Array<any>;
  tableData: Array<any>;
  data: any;
  isFetching: boolean;
  page: number;
  setPage: (p: number) => void;
  pageSize?: any;
}) => {
  const navigate = useNavigate();
  const btnCss = "aspect-square h-8 px-2";
  const iconSize = 16;
  const handlePageChange = (p: number) => {
    const next = Math.max(1, Math.min(totalPages, p));
    setPage(next); // triggers refetch via changed URL
  };
  const meta: Meta = useMemo(
    () => ({
      total: Number(data?.data?.data?.meta?.total ?? 0),
      page: Number(data?.data?.data?.meta?.page ?? page),
      pageSize: Number(data?.data?.data?.meta?.pageSize ?? pageSize),
    }),
    [data, page, pageSize]
  );
  const totalPages = Math.max(
    1,
    Math.ceil((meta.total || 0) / (meta.pageSize || DEFAULT_PAGE_SIZE))
  );
  const getPageNumbers = (): Array<number | string> => {
    if (totalPages <= 1) return [];
    const current = meta.page || page;

    const pages: Array<number | string> = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(totalPages - 1, current + 1);

    if (start > 2) pages.push("...");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("...");
    pages.push(totalPages);

    return pages;
  };

  return (
    <>
      {/* Pass ONLY the current page's rows; TablePage renders them as-is */}
      <TablePage<PollRow & { tableOptions: React.ReactNode }>
        title="Polls"
        createButtonText="Create"
        onCreate={() => navigate("/polls/create")}
        columns={columns as any}
        data={tableData}
      />

      {/* Server Pagination Controls */}
      <div className="flex items-center justify-center mt-4 gap-2 px-4">
        <Button
          variant="outline"
          className={cn(btnCss)}
          onClick={() => handlePageChange((meta.page || page) - 1)}
          disabled={(meta.page || page) <= 1 || isFetching}
        >
          <ChevronLeft size={iconSize} />
        </Button>

        {getPageNumbers().map((p, idx) =>
          typeof p === "number" ? (
            <Button
              key={`page-${p}`}
              variant={p === (meta.page || page) ? "default" : "outline"}
              className={cn(btnCss, "w-8")}
              onClick={() => handlePageChange(p)}
              disabled={isFetching}
            >
              {p}
            </Button>
          ) : (
            <Button
              key={`ellipsis-${idx}`}
              variant="ghost"
              className={cn(btnCss)}
              disabled
            >
              …
            </Button>
          )
        )}

        <Button
          variant="outline"
          className={cn(btnCss)}
          onClick={() => handlePageChange((meta.page || page) + 1)}
          disabled={(meta.page || page) >= totalPages || isFetching}
        >
          <ChevronRight size={iconSize} />
        </Button>
      </div>

      {/* Loading hint */}
      {isFetching && (
        <div className="px-4 py-2 text-sm text-muted-foreground text-center">
          Loading page {meta.page || page}…
        </div>
      )}
    </>
  );
};
