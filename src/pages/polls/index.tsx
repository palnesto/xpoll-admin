// import { endpoints } from "@/api/endpoints";
// import { queryClient } from "@/api/queryClient";
// import { ThreeDotMenu } from "@/components/commons/three-dot-menu";
// import { TablePage } from "@/components/table-page-2";
// import { CreateTablePollsModal } from "@/domains/table_polls/modals/create";
// import { DeleteTablePollsModal } from "@/domains/table_polls/modals/delete";
// import { EditTablePollsModal } from "@/domains/table_polls/modals/edit";
// import { useApiMutation } from "@/hooks/useApiMutation";
// import { useApiQuery } from "@/hooks/useApiQuery";
// import { useTablePollsStore } from "@/stores/table_polls.store";
// import { appToast } from "@/utils/toast";
// import { Edit, Trash } from "lucide-react";
// import { useCallback, useMemo } from "react";

// const Polls = () => {
//   const isCreating = useTablePollsStore((state) => state.isCreating);
//   const setIsCreating = useTablePollsStore((state) => state.setIsCreating);
//   const isEditing = useTablePollsStore((state) => state.isEditing);
//   const setIsEditing = useTablePollsStore((state) => state.setIsEditing);
//   const isDeleting = useTablePollsStore((state) => state.isDeleting);
//   const setIsDeleting = useTablePollsStore((state) => state.setIsDeleting);

//   // Fetch data using API query
//   const { data } = useApiQuery(endpoints.entities.polls.all);
//   const tableFilteredData = useMemo(() => data?.data?.data ?? [], [data]);

//   // Reorder mutation
//   const { mutate } = useApiMutation({
//     route: endpoints.entities.polls.all,
//     method: "PATCH",
//     onSuccess: () => {
//       queryClient.invalidateQueries();
//       appToast.success("Table reordered successfully");
//     },
//   });

//   const actions = useCallback(
//     (id: string) => [
//       {
//         name: "Edit",
//         icon: Edit,
//         onClick: () => setIsEditing(id),
//       },
//       {
//         name: "Delete",
//         icon: Trash,
//         onClick: () => setIsDeleting(id),
//         separatorBefore: true,
//       },
//     ],
//     [setIsEditing, setIsDeleting]
//   );

//   const tableData = useMemo(
//     () =>
//       tableFilteredData.map(
//         ({
//           _id,
//           poll_name,
//           designation,
//           remark,
//         }: {
//           _id: string;
//           poll_name: string;
//           designation: string;
//           remark: string;
//         }) => ({
//           _id,
//           poll_name,
//           designation,
//           remark,
//           options: <ThreeDotMenu actions={actions(_id)} />,
//         })
//       ) || [],
//     [tableFilteredData, actions]
//   );

//   const columns = [
//     { key: "poll_name", header: "Poll Name", canFilter: true },
//     { key: "designation", header: "Designation" },
//     { key: "remark", header: "Remark" },
//     {
//       key: "options",
//       header: "...",
//       render: (value: any) => <span>{value}</span>,
//       isRightAligned: true,
//     },
//   ];

//   const handleReorder = async ({
//     movedRow,
//     sourceIndex,
//     destinationIndex,
//     newOrder,
//   }: {
//     movedRow: any;
//     sourceIndex: number;
//     destinationIndex: number;
//     newOrder: any[];
//   }) => {
//     console.log("Row moved:", movedRow);
//     console.log("From index:", sourceIndex, "to index:", destinationIndex);
//     console.log("New order:", newOrder);
//     // For example, call your API with newOrder or the changed row info:
//     mutate({
//       rowId: movedRow._id,
//       newIndex: destinationIndex,
//     });
//     queryClient.invalidateQueries();
//   };

//   return (
//     <>
//       {isCreating && <CreateTablePollsModal />}
//       {isEditing && <EditTablePollsModal />}
//       {isDeleting && <DeleteTablePollsModal />}
//       <TablePage
//         title="Table Polls"
//         createButtonText="Create"
//         onCreate={() => setIsCreating(true)}
//         columns={columns}
//         data={tableData}
//         onReorder={handleReorder}
//       />
//     </>
//   );
// };

// export default Polls;

// import { endpoints } from "@/api/endpoints";
// import { queryClient } from "@/api/queryClient";
// import { ThreeDotMenu } from "@/components/commons/three-dot-menu";
// import { TablePage } from "@/components/table-page";
// import { DeleteTablePollsModal } from "@/domains/table_polls/modals/delete";
// import { useApiMutation } from "@/hooks/useApiMutation";
// import { useApiQuery } from "@/hooks/useApiQuery";
// import { useTablePollsStore } from "@/stores/table_polls.store";
// import { appToast } from "@/utils/toast";
// import { Edit, Trash } from "lucide-react";
// import { useCallback, useMemo } from "react";
// import { useNavigate } from "react-router-dom";

// type PollRow = {
//   _id: string;
//   title: string;
//   createdAt?: string;
//   archivedAt?: string | null;
// };

// const Polls = () => {
//   const navigate = useNavigate();
//   const isDeleting = useTablePollsStore((s) => s.isDeleting);
//   const setIsDeleting = useTablePollsStore((s) => s.setIsDeleting);

//   // GET /poll/list returns ApiResponse { data: { entries, meta } }
//   const { data } = useApiQuery(endpoints.entities.polls.all);
//   const rows: PollRow[] = useMemo(
//     () => data?.data?.data?.entries ?? [],
//     [data]
//   );

//   // (Optional) reorder support
//   // const { mutate } = useApiMutation<{ order: string[] }, any>({
//   //   route: endpoints.entities.polls.all,
//   //   method: "PATCH",
//   //   onSuccess: () => {
//   //     queryClient.invalidateQueries({
//   //       queryKey: [endpoints.entities.polls.all],
//   //     });
//   //     appToast.success("Table reordered successfully");
//   //   },
//   // });

//   const actions = useCallback(
//     (id: string) => [
//       {
//         name: "Edit",
//         icon: Edit,
//         onClick: () => navigate(`/polls/${id}/edit`),
//       },
//       {
//         name: "Delete",
//         icon: Trash,
//         onClick: () => setIsDeleting(id),
//         separatorBefore: true,
//       },
//     ],
//     [navigate, setIsDeleting]
//   );

//   const tableData = useMemo(
//     () =>
//       rows.map((r) => ({
//         ...r,
//         tableOptions: <ThreeDotMenu actions={actions(r._id)} />,
//       })),
//     [rows, actions]
//   );

//   const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString() : "-");

//   const columns = [
//     { key: "_id", header: "ID" },
//     { key: "title", header: "Title", canFilter: true },
//     {
//       key: "createdAt",
//       header: "Created At",
//       render: (val: any) => <span>{fmt(val)}</span>,
//     },
//     {
//       key: "archivedAt",
//       header: "Archived At",
//       render: (val: any) => <span>{fmt(val)}</span>,
//     },
//     {
//       key: "tableOptions",
//       header: "...",
//       render: (v: any) => <span>{v}</span>,
//       isRightAligned: true,
//     },
//   ];

//   // const handleReorder = async ({
//   //   newOrder,
//   // }: {
//   //   movedRow: any;
//   //   sourceIndex: number;
//   //   destinationIndex: number;
//   //   newOrder: any[];
//   // }) => {
//   //   mutate({ order: newOrder.map((r: PollRow) => r._id) });
//   //   queryClient.invalidateQueries({ queryKey: [endpoints.entities.polls.all] });
//   // };

//   return (
//     <>
//       <TablePage<PollRow>
//         title="Polls"
//         createButtonText="Create"
//         onCreate={() => navigate("/polls/create")}
//         columns={columns as any}
//         data={tableData}
//         // onReorder={handleReorder}
//       />
//       {isDeleting && <DeleteTablePollsModal />}
//     </>
//   );
// };

// export default Polls;
// pages/polls/index.tsx
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

const DEFAULT_PAGE_SIZE = 10;

export default function Polls() {
  const navigate = useNavigate();
  const isDeleting = useTablePollsStore((s) => s.isDeleting);
  const setIsDeleting = useTablePollsStore((s) => s.setIsDeleting);

  // ✅ Server-side pagination state (1-based)
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  // ✅ Build URL so key changes on page/pageSize — will refetch automatically
  const url = `${endpoints.entities.polls.all}?page=${page}&pageSize=${pageSize}`;
  const { data, isFetching } = useApiQuery(url, { keepPreviousData: true });

  // shape from server: { data: { entries, meta } }
  const entries: PollRow[] = useMemo(
    () => data?.data?.data?.entries ?? [],
    [data]
  );
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

  // ---- Pagination UI helpers (server-driven) ----
  const handlePageChange = (p: number) => {
    const next = Math.max(1, Math.min(totalPages, p));
    setPage(next); // triggers refetch via changed URL
  };

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

  // Small responsive tweaks for the buttons
  const iconSize = 16;
  const btnCss = "aspect-square h-8 px-2";

  return (
    <>
      {/* Pass ONLY the current page's rows; TablePage renders them as-is */}
      <TablePage<PollRow & { tableOptions: React.ReactNode }>
        title="Polls"
        createButtonText="Create"
        onCreate={() => navigate("/polls/create")}
        columns={columns as any}
        data={tableData}
        // setPage={ }
        // Do NOT pass pageSize to TablePage → avoids local pagination
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

      {isDeleting && <DeleteTablePollsModal />}
    </>
  );
}
