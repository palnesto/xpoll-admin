import React, {
  useLayoutEffect,
  useState,
  useRef,
  useMemo,
  useEffect,
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
import { Copy, CopyCheck, Plus, GripVertical, ChevronLeft } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "react-beautiful-dnd";

export const DraggableTableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>((props, ref) => {
  return <tr ref={ref} {...props} />;
});
DraggableTableRow.displayName = "DraggableTableRow";
type TableColumn<T> = {
  key: keyof T;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  isRightAligned?: boolean;
  canFilter?: boolean;
};

type TablePageProps<T> = {
  title?: string;
  createButtonText?: string;
  onCreate?: () => void;
  onReorder?: (params: {
    movedRow: T;
    sourceIndex: number;
    destinationIndex: number;
    newOrder: T[];
  }) => void;
  columns: TableColumn<T>[];
  data: T[];
  backOnClick?: () => void;
};

const commonColumnStyle = {
  minWidth: "200px",
  maxWidth: "800px",
};

export function TablePage<T extends { _id?: string }>({
  title,
  createButtonText,
  onCreate,
  onReorder,
  columns,
  data,
  backOnClick,
}: TablePageProps<T>) {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLDivElement | null>(null);

  const [screenHeight, setScreenHeight] = useState<number>(0);
  const [tableTop, setTableTop] = useState<number>(0);
  const [maxHeight, setMaxHeight] = useState<string>("100vh");

  const [screenWidth, setScreenWidth] = useState<number>(0);
  const [tableLeft, setTableLeft] = useState<number>(0);
  const [maxWidth, setMaxWidth] = useState<string>("100vw");

  const [filterEnabled, setFilterEnabled] = useState<boolean>(false);
  const [searchTerms, setSearchTerms] = useState<{ [key: string]: string }>({});

  const [orderedData, setOrderedData] = useState<T[]>(data);

  useEffect(() => {
    setOrderedData(data);
  }, [data]);

  const calculateHeightsAndWidths = () => {
    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;
    const tableTop = tableRef.current
      ? tableRef.current.getBoundingClientRect().top + window.scrollY
      : 0;
    const tableLeft = tableRef.current
      ? tableRef.current.getBoundingClientRect().left
      : 0;
    setScreenHeight(screenHeight);
    setScreenWidth(screenWidth);
    setTableTop(tableTop);
    setTableLeft(tableLeft);
    const availableHeight = screenHeight - tableTop - 80;
    const availableWidth = screenWidth - tableLeft - 70;
    setMaxHeight(`${availableHeight}px`);
    setMaxWidth(`${availableWidth}px`);
  };

  useLayoutEffect(() => {
    calculateHeightsAndWidths();
    window.addEventListener("resize", calculateHeightsAndWidths);
    return () =>
      window.removeEventListener("resize", calculateHeightsAndWidths);
  }, []);

  const filteredData = useMemo(() => {
    return orderedData.filter((row) =>
      columns.every((column) => {
        if (!column.canFilter) return true;
        const term = searchTerms[String(column.key)] || "";
        if (!term) return true;
        const cellValue = row[column.key];
        if (cellValue === null || cellValue === undefined) return false;
        return String(cellValue).toLowerCase().includes(term.toLowerCase());
      })
    );
  }, [orderedData, columns, searchTerms]);

  // Enable drag & drop only if onReorder is provided.
  const isReorderEnabled = typeof onReorder === "function";

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    const newOrderedData = Array.from(orderedData);
    const [removed] = newOrderedData.splice(sourceIndex, 1);
    newOrderedData.splice(destinationIndex, 0, removed);
    setOrderedData(newOrderedData);
    if (onReorder) {
      onReorder({
        movedRow: removed,
        sourceIndex,
        destinationIndex,
        newOrder: newOrderedData,
      });
    }
  };

  const isDndEnabled = useMemo(
    () => isReorderEnabled && !filterEnabled,
    [isReorderEnabled, filterEnabled]
  );
  return (
    <>
      {backOnClick && (
        <Button size={"icon"} className="rounded-full" onClick={backOnClick}>
          <ChevronLeft />
        </Button>
      )}
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
          ref={tableRef}
          style={{
            overflowX: "auto",
            borderRadius: "8px",
            maxWidth: maxWidth,
          }}
        >
          <div
            className="scrollbar-y scrollbar-x w-full"
            style={{
              overflowX: "auto",
              overflowY: "auto",
              maxHeight: maxHeight,
            }}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  {isDndEnabled && (
                    <TableHead style={{ width: "40px" }}></TableHead>
                  )}
                  {columns.map((column) => (
                    <TableHead
                      key={String(column.key)}
                      style={commonColumnStyle}
                      className={cn(column.isRightAligned && "text-right pr-5")}
                    >
                      {column.header}
                    </TableHead>
                  ))}
                </TableRow>
                {filterEnabled && (
                  <TableRow>
                    {isDndEnabled && (
                      <TableHead style={{ width: "40px" }}></TableHead>
                    )}
                    {columns.map((column) => (
                      <TableHead
                        key={`search-${String(column.key)}`}
                        style={commonColumnStyle}
                        className={cn(
                          column.isRightAligned && "text-right pr-5"
                        )}
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
              {isDndEnabled ? (
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="table-body">
                    {(provided, snapshot) => (
                      <TableBody
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(snapshot.isDraggingOver && "bg-muted/10")}
                      >
                        {filteredData.map((row, index) => {
                          const draggableId = String(row._id || `row-${index}`);
                          return (
                            <Draggable
                              key={draggableId}
                              draggableId={draggableId}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <DraggableTableRow
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={cn(
                                    snapshot.isDragging && "bg-muted/50"
                                  )}
                                >
                                  {/* Drag handle cell */}
                                  <TableCell
                                    style={{ width: "40px", cursor: "grab" }}
                                    {...provided.dragHandleProps}
                                  >
                                    <GripVertical size={20} />
                                  </TableCell>
                                  {columns.map((column) => (
                                    <TableCell
                                      style={commonColumnStyle}
                                      key={String(column.key)}
                                      className={cn(
                                        column.isRightAligned && "text-right"
                                      )}
                                    >
                                      {column.render ? (
                                        column.render(row[column.key], row)
                                      ) : (
                                        <TooltipProvider delayDuration={0}>
                                          <Tooltip>
                                            <TooltipTrigger>
                                              {truncateText(
                                                row[column.key],
                                                28
                                              )}
                                            </TooltipTrigger>
                                            <TooltipContentWithCopy
                                              copyText={
                                                row[column.key] as string
                                              }
                                            >
                                              {row[column.key]}
                                            </TooltipContentWithCopy>
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                    </TableCell>
                                  ))}
                                </DraggableTableRow>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </TableBody>
                    )}
                  </Droppable>
                </DragDropContext>
              ) : (
                <TableBody>
                  {filteredData.map((row, index) => {
                    const rowId = String(row._id || `row-${index}`);
                    return (
                      <TableRow key={rowId}>
                        {isDndEnabled && (
                          <TableCell style={{ width: "40px" }}>
                            {/* Placeholder cell */}
                          </TableCell>
                        )}
                        {columns.map((column) => (
                          <TableCell
                            style={commonColumnStyle}
                            key={String(column.key)}
                            className={cn(
                              column.isRightAligned && "text-right"
                            )}
                          >
                            {column.render ? (
                              column.render(row[column.key], row)
                            ) : (
                              <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                  <TooltipTrigger>
                                    {truncateText(row[column.key], 28)}
                                  </TooltipTrigger>
                                  <TooltipContentWithCopy
                                    copyText={row[column.key] as string}
                                  >
                                    {row[column.key]}
                                  </TooltipContentWithCopy>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              )}
            </Table>
          </div>
        </div>
      </div>
    </>
  );
}

function truncateText(
  text: any,
  maxLength: number,
  ellipsis: string = "..."
): any {
  if (typeof text !== "string") return text;
  if (!text) return text;
  if (text.length <= maxLength) return text;
  const truncationLength = maxLength - ellipsis.length;
  return text.slice(0, truncationLength) + ellipsis;
}

const TooltipContentWithCopy = ({
  children,
  copyText,
}: {
  children: any;
  copyText: string;
}) => {
  const [copyStatus, setCopyStatus] = useState("");
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopyStatus("Copied!");
      setTimeout(() => setCopyStatus(""), 2000);
    } catch (err) {
      setCopyStatus("Failed to copy!");
      setTimeout(() => setCopyStatus(""), 2000);
    }
  };
  return (
    <TooltipContent>
      <div className="flex gap-2 items-center">
        <p className="bg-foreground text-background p-2 rounded-lg">
          {children}
        </p>
        <button
          className="bg-foreground text-background p-2 rounded-lg hover:bg-background/20"
          onClick={handleCopy}
        >
          {copyStatus ? (
            <CopyCheck className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
    </TooltipContent>
  );
};
