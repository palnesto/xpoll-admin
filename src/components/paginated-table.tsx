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
  data: any;
  isFetching: boolean;
  page: number;
  setPage: (p: number) => void;
  pageSize?: any;
  usingRef?: boolean;
};

export const fmt = (v?: string | null) =>
  v && v.trim() ? new Date(v).toISOString() : undefined;

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
  usingRef = true,
}: PaginatedTableProps<any>) => {
  const btnCss = "aspect-square h-8 px-2";
  const iconSize = 16;

  // API returns: { data: { items, page, pageSize, total, totalPages } }
  const payload = data?.data?.data;

  const meta: Meta = useMemo(
    () => ({
      total: Number(payload?.total ?? 0),
      page: Number(payload?.page ?? page),
      pageSize: Number(payload?.pageSize ?? pageSize ?? DEFAULT_PAGE_SIZE),
    }),
    [payload, page, pageSize]
  );

  const computedTotalPages = Math.max(
    1,
    Math.ceil((meta.total || 0) / (meta.pageSize || DEFAULT_PAGE_SIZE))
  );
  const totalPages =
    Number.isFinite(payload?.totalPages) && payload?.totalPages > 0
      ? Number(payload.totalPages)
      : computedTotalPages;

  const currentPage = meta.page || page;

  const handlePageChange = (p: number) => {
    const next = Math.max(1, Math.min(totalPages, p));
    if (next === currentPage) return;
    setPage(next);
  };

  // Build a compact page list including: 1, current-1..current+1, mid, last
  const pageItems: Array<number | string> = useMemo(() => {
    if (totalPages <= 1) return [];

    const mid = Math.floor((1 + totalPages) / 2);

    const set = new Set<number>();
    set.add(1);
    set.add(totalPages);

    // neighbors of current
    for (const n of [currentPage - 1, currentPage, currentPage + 1]) {
      if (n >= 1 && n <= totalPages) set.add(n);
    }

    // mid page (if meaningful)
    if (mid !== 1 && mid !== totalPages) set.add(mid);

    // turn into sorted array
    const nums = Array.from(set).sort((a, b) => a - b);

    // insert ellipses for gaps
    const out: Array<number | string> = [];
    for (let i = 0; i < nums.length; i++) {
      const n = nums[i];
      if (i === 0) {
        out.push(n);
        continue;
      }
      const prev = nums[i - 1];
      if (n === prev + 1) {
        out.push(n);
      } else {
        out.push("…", n);
      }
    }

    return out;
  }, [currentPage, totalPages]);

  return (
    <div className="h-full">
      {/* Render only current page’s rows */}
      <TablePage
        title={title}
        createButtonText={createButtonText}
        onCreate={onCreate}
        columns={columns as any}
        data={tableData}
        usingRef={usingRef}
      />

      {/* Server Pagination Controls */}
      <div className="flex items-center justify-center mt-4 gap-2 jpx-4">
        <Button
          variant="outline"
          className={cn(btnCss)}
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={iconSize} />
        </Button>

        {pageItems.map((p, idx) =>
          typeof p === "number" ? (
            <Button
              key={`page-${p}`}
              variant={p === currentPage ? "default" : "outline"}
              className={cn(btnCss, "w-8")}
              onClick={() => handlePageChange(p)}
            >
              {p}
            </Button>
          ) : (
            <Button
              key={`ellipsis-${idx}`}
              variant="ghost"
              className={cn(btnCss)}
              disabled
              tabIndex={-1}
            >
              {p}
            </Button>
          )
        )}

        <Button
          variant="outline"
          className={cn(btnCss)}
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight size={iconSize} />
        </Button>
      </div>

      {/* Loading hint */}
      {isFetching && (
        <div className="px-4 py-2 text-sm text-muted-foreground text-center">
          Loading page {currentPage}…
        </div>
      )}
    </div>
  );
};
