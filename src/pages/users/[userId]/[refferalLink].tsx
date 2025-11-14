// src/pages/users/[userId]/referrals.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ArrowLeft, Link2 } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";
import { utcToAdminFormatted } from "@/utils/time";

const PAGE_SIZE = 100;

type ReferralRow = {
  _id: string;
  archivedAt: string | null;
  counts: {
    uniques: number;
    views: number;
  };
  createdAt: string;
  entityId: string;
  firstVisitAt: string | null;
  hasAnyVisitor: boolean;
  kind: "poll" | "trial" | string;
  lastVisitAt: string | null;
  level: number;
  sharerExternalAccountId: string;
  username: string;
  avatar?: {
    name: string;
    imageUrl: string;
  };
  gender?: string | null;
  civicScore?: number;
  city?: {
    _id: string;
    countryId: string;
    stateId: string;
    name: string;
    stateName: string;
    countryName: string;
  };
  state?: string;
  country?: string;
};

type ReferralListingResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: ReferralRow[];
};

const UserReferralLinksPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [sortByViews, setSortByViews] = useState(false);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // ---- Build params (sharerExternalAccountIds is mandatory) ----
  const params = useMemo(() => {
    const p: Record<string, any> = {
      page,
      pageSize: PAGE_SIZE,
      sharerExternalAccountIds: userId,
    };

    if (sortByViews) {
      p.sortBy = "views";
      p.sortDir = sortDir;
    }

    return p;
  }, [page, sortByViews, sortDir, userId]);

  const urlWithQuery = useMemo(() => {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        usp.set(k, String(v));
      }
    });

    const base = endpoints.referral.listing;
    const qs = usp.toString();
    return qs ? `${base}?${qs}` : base;
  }, [params]);

  const { data, isLoading, isFetching, error, refetch } = useApiQuery(
    urlWithQuery,
    { key: ["referral-listing", userId, urlWithQuery] } as any
  );
  console.log("data", data);
  useEffect(() => {
    try {
      (refetch as any)?.();
    } catch {
      // ignore
    }
  }, [urlWithQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const payload: ReferralListingResponse | undefined = data?.data?.data;
  const items: ReferralRow[] = payload?.items ?? [];

  const total: number =
    typeof payload?.total === "number" ? payload.total : items.length ?? 0;

  const totalPages: number =
    typeof payload?.totalPages === "number" && payload.totalPages > 0
      ? payload.totalPages
      : Math.max(1, Math.ceil((total || 1) / PAGE_SIZE));

  const currentPage: number =
    typeof payload?.page === "number" && payload.page > 0 ? payload.page : page;

  // Build page list with ellipses
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

  return (
    <div className="flex flex-col gap-6 md:px-4 h-full">
      {/* Top bar */}
      <section className="flex flex-col gap-4 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={() => navigate(`/users/${userId}`)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <Link2 className="w-6 h-6 text-muted-foreground" />
                Referral Links
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground break-all">
                Sharer ID: {userId}
              </p>
            </div>
          </div>
        </div>

        {/* Controls row: sort by views toggle + direction */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs md:text-sm">
              Sort by views
            </span>
            <Switch
              checked={sortByViews}
              onCheckedChange={(v) => {
                setSortByViews(v);
                setPage(1);
              }}
              aria-label="Toggle sort by views"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm text-muted-foreground">
              Direction
            </span>
            <Select
              disabled={!sortByViews}
              value={sortDir}
              onValueChange={(v: "asc" | "desc") => {
                setSortDir(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-28">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Desc</SelectItem>
                <SelectItem value="asc">Asc</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading / error states */}
        {isLoading && (
          <p className="text-sm text-muted-foreground">
            Loading referral links…
          </p>
        )}

        {error && !isLoading && (
          <p className="text-sm text-red-500">Failed to load referral links.</p>
        )}

        {!isLoading && !error && !items.length && (
          <p className="text-sm text-muted-foreground">
            No referral links found.
          </p>
        )}
      </section>

      {/* List */}
      <div className="flex flex-col gap-4 max-w-6xl mx-auto w-full max-h-[70vh] overflow-y-auto pb-4">
        {items.map((row) => {
          const cityName = row.city?.name;
          const stateName = row.city?.stateName;
          const countryName = row.city?.countryName;

          return (
            <Card
              key={row._id}
              className="rounded-3xl bg-primary/5 flex flex-col md:flex-row md:items-stretch gap-4 p-4"
            >
              {/* Left: Avatar / user info */}
              <div className="flex items-start gap-3 md:w-1/3">
                {row.avatar?.imageUrl ? (
                  <img
                    src={row.avatar.imageUrl}
                    alt={row.avatar.name}
                    className="w-12 h-12 rounded-full object-cover border bg-background"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border">
                    <Link2 className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}

                <div className="flex flex-col gap-1 text-xs md:text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{row.username}</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] border bg-background capitalize">
                      {row.kind} • L{row.level}
                    </span>
                  </div>
                  <span className="text-muted-foreground text-[11px]">
                    Entity: {row.entityId}
                  </span>
                  {cityName && (
                    <span className="text-muted-foreground text-[11px]">
                      {cityName}
                      {stateName ? `, ${stateName}` : ""}
                      {countryName ? `, ${countryName}` : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* Right: stats & dates */}
              <div className="flex-1 flex flex-col md:flex-row gap-4 justify-between text-xs md:text-sm">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-[11px] text-muted-foreground">
                    Stats
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 rounded-full border bg-background text-[11px]">
                      Views: {row.counts.views}
                    </span>
                    <span className="px-2 py-0.5 rounded-full border bg-background text-[11px]">
                      Unique: {row.counts.uniques}
                    </span>
                    <span className="px-2 py-0.5 rounded-full border bg-background text-[11px]">
                      Visitors: {row.hasAnyVisitor ? "Yes" : "No"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 md:text-right">
                  <span className="font-medium text-[11px] text-muted-foreground">
                    Timeline
                  </span>
                  <span>Created: {utcToAdminFormatted(row.createdAt)}</span>
                  <span>
                    First visit:{" "}
                    {row.firstVisitAt
                      ? utcToAdminFormatted(row.firstVisitAt)
                      : "—"}
                  </span>
                  <span>
                    Last visit:{" "}
                    {row.lastVisitAt
                      ? utcToAdminFormatted(row.lastVisitAt)
                      : "—"}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {items.length > 0 && (
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
      )}
    </div>
  );
};

export default UserReferralLinksPage;
