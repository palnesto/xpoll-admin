// components/table-page-server.tsx
import React, {
  useLayoutEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TooltipWithCopy } from "./tooltip-content-with-copy";

export type TableColumn<T> = {
  key: keyof T;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  isRightAligned?: boolean;
};

type ServerTablePageProps<T> = {
  title?: string;
  createButtonText?: string;
  onCreate?: () => void;
  columns: TableColumn<T>[];
  data: T[]; // already server-paginated
  page: number; // 1-based
  pageSize: number; // request limit
  total: number; // total records server-side
  onPageChange: (page: number) => void;
};

export function TablePageServer<T>({
  title,
  createButtonText,
  onCreate,
  columns,
  data,
  page,
  pageSize,
  total,
  onPageChange,
}: ServerTablePageProps<T>) {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLDivElement | null>(null);

  const [screenHeight, setScreenHeight] = useState<number>(0);
  const [tableTop, setTableTop] = useState<number>(0);
  const [maxHeight, setMaxHeight] = useState<string>("100vh");

  const [screenWidth, setScreenWidth] = useState<number>(0);
  const [tableLeft, setTableLeft] = useState<number>(0);
  const [maxWidth, setMaxWidth] = useState<string>("100vw");

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / Math.max(1, pageSize || 1))),
    [total, pageSize]
  );

  const handlePageChange = useCallback(
    (p: number) => {
      const clamped = Math.max(1, Math.min(totalPages, p));
      if (clamped !== page) onPageChange(clamped);
    },
    [onPageChange, page, totalPages]
  );

  const getPageNumbers = (): Array<number | string> => {
    if (totalPages <= 1) return [];
    const pages: Array<number | string> = [1];
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    if (start > 2) pages.push("...");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("...");
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };

  const calculateHeightsAndWidths = () => {
    const sh = window.innerHeight;
    const sw = window.innerWidth;

    const tTop = tableRef.current
      ? tableRef.current.getBoundingClientRect().top + window.scrollY
      : 0;

    const tLeft = tableRef.current
      ? tableRef.current.getBoundingClientRect().left
      : 0;

    setScreenHeight(sh);
    setScreenWidth(sw);
    setTableTop(tTop);
    setTableLeft(tLeft);

    const availableHeight = sh - tTop - 80;
    const availableWidth = sw - tLeft - 70;

    setMaxHeight(`${availableHeight}px`);
    setMaxWidth(`${availableWidth}px`);
  };

  useLayoutEffect(() => {
    calculateHeightsAndWidths();
    window.addEventListener("resize", calculateHeightsAndWidths);
    return () =>
      window.removeEventListener("resize", calculateHeightsAndWidths);
  }, []);

  const isMobile = screenWidth < 768;
  const iconSize = 16;
  const btnCss = "aspect-square h-2 text-[10px] p-2 sm:text-[12px] sm:p-3";

  return (
    <div style={{ padding: "32px 16px" }}>
      {(title || onCreate || createButtonText) && (
        <div
          ref={headerRef}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          {title && (
            <h1 style={{ fontSize: "24px", fontWeight: "bold" }}>{title}</h1>
          )}
          <div style={{ display: "flex", gap: "8px" }}>
            {onCreate && (
              <Button onClick={onCreate}>
                <Plus />
                {createButtonText ?? "Create"}
              </Button>
            )}
          </div>
        </div>
      )}

      <div
        className="border-2 border-muted scrollbar-x"
        ref={tableRef}
        style={{ overflowX: "auto", borderRadius: "8px", maxWidth }}
      >
        <div
          className="scrollbar-y scrollbar-x w-full"
          style={{ overflowX: "auto", overflowY: "auto", maxHeight }}
        >
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={String(column.key)}
                    className={cn(column.isRightAligned && "text-right pr-5")}
                  >
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((column) => (
                    <TableCell
                      key={String(column.key)}
                      style={{ minWidth: "200px", maxWidth: "800px" }}
                      className={cn(column.isRightAligned && "text-right")}
                    >
                      {column.render ? (
                        column.render((row as any)[column.key], row)
                      ) : (
                        <TooltipWithCopy tooltipText={(row as any)[column.key]}>
                          <span>
                            {truncateText((row as any)[column.key], 28)}
                          </span>
                        </TooltipWithCopy>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Server-side Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center mt-4 gap-2 -translate-x-5">
          {isMobile ? (
            <>
              <Button
                variant="outline"
                className={cn(btnCss)}
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft size={iconSize} />
              </Button>
              <Button
                variant={page === 1 ? "default" : "outline"}
                className={cn(btnCss)}
                onClick={() => handlePageChange(1)}
              >
                1
              </Button>
              {totalPages > 2 && page > 2 && (
                <Button variant="ghost" className={cn(btnCss)} disabled>
                  …
                </Button>
              )}
              {totalPages > 2 && page !== 1 && page !== totalPages && (
                <Button
                  variant="default"
                  className={cn(btnCss)}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              )}
              {totalPages > 2 && page < totalPages - 1 && (
                <Button variant="ghost" className={cn(btnCss)} disabled>
                  …
                </Button>
              )}
              <Button
                variant={page === totalPages ? "default" : "outline"}
                className={cn(btnCss)}
                onClick={() => handlePageChange(totalPages)}
              >
                {totalPages}
              </Button>
              <Button
                variant="outline"
                className={cn(btnCss)}
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
              >
                <ChevronRight size={iconSize} />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                className={cn(btnCss)}
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft size={iconSize} />
              </Button>
              {getPageNumbers().map((p, idx) =>
                typeof p === "number" ? (
                  <Button
                    key={`page-${p}`}
                    variant={p === page ? "default" : "outline"}
                    className={cn(btnCss)}
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
                  >
                    {p}
                  </Button>
                )
              )}
              <Button
                variant="outline"
                className={cn(btnCss)}
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
              >
                <ChevronRight size={iconSize} />
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function truncateText(
  text: any,
  maxLength: number,
  ellipsis: string = "…"
): any {
  if (typeof text !== "string") return text;
  if (!text || text.length <= maxLength) return text;
  const truncationLength = maxLength - ellipsis.length;
  return text.slice(0, truncationLength) + ellipsis;
}
