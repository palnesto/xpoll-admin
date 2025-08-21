import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { TablePage, TablePageProps } from "./table-page";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import { useMemo } from "react";

export type PollRow = {
  _id: string;
  title: string;
  createdAt?: string;
  archivedAt?: string | null;
};

type Meta = {
  total: number;
  page: number;
  pageSize: number;
};

type PaginatedTableProps<T> = Exclude<TablePageProps<T>, "data"> & {
  tableData: T[];
} & {
  // Additional properties for pagination
  data: any;
  isFetching: boolean;
  page: number;
  setPage: (p: number) => void;
  pageSize?: any;
};
export const fmt = (v?: string | null) =>
  v ? new Date(v).toLocaleString() : "-";

export const PaginatedTable = ({
  title,
  columns,
  tableData,
  createButtonText,
  onCreate,
  data,
  isFetching,
  page,
  setPage,
  pageSize,
}: PaginatedTableProps<any>) => {
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
        title={title}
        createButtonText={createButtonText}
        onCreate={onCreate}
        columns={columns as any}
        data={tableData}
      />

      {/* Server Pagination Controls */}
      <div className="flex items-center justify-center mt-4 gap-2 jpx-4">
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
