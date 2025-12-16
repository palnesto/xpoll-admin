import React, { useLayoutEffect, useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { TooltipWithCopy } from "./tooltip-content-with-copy";

type TableColumn<T> = {
  key: keyof T;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  isRightAligned?: boolean;
  canFilter?: boolean; // New property: only columns with canFilter true will show a search input
};

export type TablePageProps<T> = {
  title?: string;
  createButtonText?: string;
  onCreate?: () => void;
  columns: TableColumn<T>[];
  data: T[];
  usingRef?: boolean;
  rowClassName?: (row: T, rowIndex: number) => string;
};

export function TablePage<T>({
  title,
  createButtonText,
  onCreate,
  columns,
  data,
  usingRef = true,
  rowClassName,
}: TablePageProps<T>) {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLDivElement | null>(null);

  const [screenHeight, setScreenHeight] = useState<number>(0);
  const [tableTop, setTableTop] = useState<number>(0);
  const [maxHeight, setMaxHeight] = useState<string>("100vh");

  const [screenWidth, setScreenWidth] = useState<number>(0);
  const [tableLeft, setTableLeft] = useState<number>(0);
  const [maxWidth, setMaxWidth] = useState<string>("100vw");

  // New state to toggle filter row visibility
  const [filterEnabled, setFilterEnabled] = useState<boolean>(false);

  // New state to hold search terms for each column
  const [searchTerms, setSearchTerms] = useState<{ [key: string]: string }>({});

  const calculateHeightsAndWidths = () => {
    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;

    // Get top position of the table relative to the entire page
    const tableTop = tableRef.current
      ? tableRef.current.getBoundingClientRect().top + window.scrollY
      : 0;

    // Get left position of the table relative to the entire page
    const tableLeft = tableRef.current
      ? tableRef.current.getBoundingClientRect().left
      : 0;

    setScreenHeight(screenHeight);
    setScreenWidth(screenWidth);
    setTableTop(tableTop);
    setTableLeft(tableLeft);

    const availableHeight = screenHeight - tableTop - 80; // 80px is padding/margin
    const availableWidth = screenWidth - tableLeft - 70; // Subtract some padding (optional)

    setMaxHeight(`${availableHeight}px`);
    setMaxWidth(`${availableWidth}px`);
  };

  useLayoutEffect(() => {
    calculateHeightsAndWidths();
    window.addEventListener("resize", calculateHeightsAndWidths);
    return () =>
      window.removeEventListener("resize", calculateHeightsAndWidths);
  }, []);

  // Filter the data based only on columns that have canFilter true.
  const filteredData = useMemo(() => {
    return data.filter((row) =>
      columns.every((column) => {
        if (!column.canFilter) return true;
        const term = searchTerms[String(column.key)] || "";
        if (!term) return true;
        const cellValue = row[column.key];
        if (cellValue === null || cellValue === undefined) return false;
        return String(cellValue).toLowerCase().includes(term.toLowerCase());
      })
    );
  }, [data, columns, searchTerms]);

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
            <Button
              variant="outline"
              onClick={() => setFilterEnabled((prev) => !prev)}
            >
              {filterEnabled ? "Disable Filters" : "Enable Filters"}
            </Button>
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
        ref={usingRef ? tableRef : undefined}
        style={{
          overflowX: "auto",
          borderRadius: "8px",
          maxWidth: maxWidth, // Dynamically update max width
        }}
      >
        <div
          className="scrollbar-y scrollbar-x w-full"
          style={{
            overflowX: "auto",
            overflowY: "auto",
            maxHeight: maxHeight, // Dynamically update max height
          }}
        >
          <Table>
            <TableHeader className="bg-zinc-800">
              {/* Header Row */}
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={
                      String(column.key) + String(Math.random() * Math.random())
                    }
                    className={cn(column.isRightAligned && "text-right pr-5")}
                  >
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
              {/* Search Input Row (only rendered if filterEnabled is true) */}
              {filterEnabled && (
                <TableRow>
                  {columns.map((column) => (
                    <TableHead
                      key={`search-${String(column.key)}`}
                      className={cn(column.isRightAligned && "text-right pr-5")}
                    >
                      {column.canFilter ? (
                        <Input
                          type="text"
                          placeholder="Search..."
                          value={searchTerms[String(column.key)] || ""}
                          onChange={(e) =>
                            setSearchTerms((prev) => ({
                              ...prev,
                              [String(column.key)]: e.target.value,
                            }))
                          }
                          className="w-full p-1 border border-white my-2"
                        />
                      ) : null}
                    </TableHead>
                  ))}
                </TableRow>
              )}
            </TableHeader>
            <TableBody className="bg-[#18181B]">
              {filteredData.map((row, rowIndex) => (
                <TableRow
                  key={rowIndex}
                  className={cn(
                    rowClassName ? rowClassName(row, rowIndex) : ""
                  )}
                >
                  {columns.map((column) => (
                    <TableCell
                      style={{
                        minWidth: "200px",
                        maxWidth: "800px",
                      }}
                      key={String(column.key)}
                      className={cn(
                        column.isRightAligned && "text-right",
                        "px-5"
                      )}
                    >
                      {column.render ? (
                        column.render(row[column.key], row)
                      ) : (
                        <>
                          <TooltipWithCopy tooltipText={row[column.key]}>
                            <span> {truncateText(row[column.key], 28)}</span>
                          </TooltipWithCopy>
                        </>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function truncateText(
  text: any,
  maxLength: number,
  ellipsis: string = "..."
): any {
  if (typeof text !== "string") return text; // Return non-string values as is
  if (!text) return text; // Handle null, undefined, or empty strings
  if (text.length <= maxLength) return text; // No truncation needed
  const truncationLength = maxLength - ellipsis.length;
  return text.slice(0, truncationLength) + ellipsis;
}
