// src/pages/users/index.tsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useApiQuery } from "@/hooks/useApiQuery";
import { Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { endpoints } from "@/api/endpoints";

const PAGE_SIZE = 20;

type ExternalUserRow = {
  _id: string;
};

type UsersResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: ExternalUserRow[];
};

const Users = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  // ---- Build params ----
  const params = useMemo(() => {
    const p: Record<string, any> = {
      page,
      pageSize: PAGE_SIZE,
    };

    const q = search.trim();
    if (q) p.q = q;

    return p;
  }, [page, search]);

  const urlWithQuery = useMemo(() => {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        usp.set(k, String(v));
      }
    });

    const base = endpoints.users.all;
    const qs = usp.toString();
    return qs ? `${base}?${qs}` : base;
  }, [params]);

  const { data, isLoading, isFetching, error, refetch } = useApiQuery(
    urlWithQuery,
    { key: ["external-users-all", urlWithQuery] } as any
  );

  console.log("data", data);

  // force refetch when URL changes (same pattern as polls page)
  useEffect(() => {
    try {
      (refetch as any)?.();
    } catch {
      // ignore
    }
  }, [urlWithQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const payload: UsersResponse | undefined = data?.data?.data;
  const items: ExternalUserRow[] = payload?.items ?? [];

  const total: number =
    typeof payload?.total === "number" ? payload.total : items.length ?? 0;

  const totalPages: number =
    typeof payload?.totalPages === "number" && payload.totalPages > 0
      ? payload.totalPages
      : Math.max(1, Math.ceil((total || 1) / PAGE_SIZE));

  const currentPage: number =
    typeof payload?.page === "number" && payload.page > 0 ? payload.page : page;

  // Build page list with ellipses: Prev 1 2 3 … Next
  const buildPages = (): (number | "...")[] => {
    const maxPagesToShow = 9;
    const pages: (number | "...")[] = [];

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    const window = 2;
    const start = Math.max(2, currentPage - window);
    const end = Math.min(totalPages - 1, currentPage + window);

    pages.push(1);
    if (start > 2) pages.push("...");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("...");
    pages.push(totalPages);

    return pages;
  };

  const handleReset = () => {
    setSearch("");
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6 md:px-4 h-full">
      {/* Header */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold">Users</h1>
            <p className="text-muted-foreground">
              Browse all users in the system
            </p>
          </div>
        </div>

        {/* Search row */}
        <div className="flex justify-between w-full gap-2">
          <Input
            className="md:w-[40dvw]"
            placeholder="Search by q…"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            autoComplete="off"
          />
          <Button variant="secondary" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </section>

      {error ? (
        <div className="text-red-500 text-sm">Failed to load users.</div>
      ) : null}

      {(isLoading || isFetching) && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      )}

      {/* Users list */}
      <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
        {items.map((user) => (
          <Card
            key={user._id}
            className="@container/card bg-primary/5 rounded-3xl flex flex-row justify-between items-center gap-4 w-full px-4 py-3"
          >
            <CardHeader className="w-full p-0">
              <CardTitle className="text-lg font-semibold @[250px]/card:text-xl overflow-hidden text-ellipsis whitespace-nowrap">
                {user._id}
              </CardTitle>
            </CardHeader>

            <Button
              variant="outline"
              size="icon"
              className="rounded-2xl shrink-0"
              onClick={() => navigate(`/users/${user._id}`)}
              aria-label={`View user ${user._id}`}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </Card>
        ))}

        {!items.length && !isLoading && !isFetching && (
          <p className="text-sm text-muted-foreground">No users found.</p>
        )}
      </div>

      {/* Pagination Footer (same pattern as polls) */}
      <section className="sticky bottom-0 left-0 bg-background flex justify-center py-4 shadow-md w-fit mx-auto rounded-2xl">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={currentPage <= 1}
                className={
                  currentPage <= 1 ? "pointer-events-none opacity-50" : ""
                }
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) setPage(currentPage - 1);
                }}
              />
            </PaginationItem>

            {buildPages().map((p, idx) =>
              p === "..." ? (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink
                    href="#"
                    isActive={p === currentPage}
                    onClick={(e) => {
                      e.preventDefault();
                      if (p !== currentPage) setPage(p as number);
                    }}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              )
            )}

            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={currentPage >= totalPages}
                className={
                  currentPage >= totalPages
                    ? "pointer-events-none opacity-50"
                    : ""
                }
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) setPage(currentPage + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </section>
    </div>
  );
};

export default Users;
