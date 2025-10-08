import { memo, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useNavigate } from "react-router-dom";
import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";
import { usePollFilters, Tri, Opt } from "@/stores/usePollFilters";
import { Switch } from "@/components/ui/switch";
import AssetMultiSelect from "@/components/commons/selects/asset-multi-select";
import { Plus, X } from "lucide-react";
import CountrySelect from "@/components/commons/selects/country-select";
import StateSelect from "@/components/commons/selects/state-select";
import CitySelect from "@/components/commons/selects/city-select";
type TrendingWindow = "hour" | "day" | "week" | "month" | "quarter" | "year";
const PAGE_SIZE = 10;

const MemoPolls = () => {
  const navigate = useNavigate();

  const [trendingOn, setTrendingOn] = useState(false);
  const [trendingWindow, setTrendingWindow] = useState<TrendingWindow>("year");

  const {
    search,
    countryOpts,
    stateOpts,
    cityOpts,
    assetOpts,
    expired,
    exhausted,
    page,
    uiNonce,
    patch,
    reset,
  } = usePollFilters();

  // ---- Build params (ALWAYS pageSize=10) ----
  const params = useMemo(() => {
    const p: Record<string, any> = { page, pageSize: PAGE_SIZE };

    // Title-only search (backend rejects 'search')
    if (search.trim()) p.title = search.trim();

    const csv = (arr: Opt[]) =>
      arr.length ? arr.map((o) => o.value).join(",") : "";

    const countryId = csv(countryOpts);
    const stateId = csv(stateOpts);
    const cityId = csv(cityOpts);
    const assetId = csv(assetOpts);

    if (countryId) p.countryId = countryId;
    if (stateId) p.stateId = stateId;
    if (cityId) p.cityId = cityId;
    if (assetId) p.assetId = assetId;

    if (expired !== "all") p.expired = expired === "true";
    if (exhausted !== "all") p.exhausted = exhausted === "true";
    if (trendingOn) p.sortedByHighestVotes = trendingWindow;

    return p;
  }, [
    page,
    search,
    countryOpts,
    stateOpts,
    cityOpts,
    assetOpts,
    expired,
    exhausted,
    trendingOn,
    trendingWindow,
  ]);

  const urlWithQuery = useMemo(() => {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") usp.set(k, String(v));
    });
    const base = endpoints.entities.polls.advancedListing; // "/internal/poll/advanced-listing"
    const qs = usp.toString();
    return qs ? `${base}?${qs}` : base;
  }, [params]);

  const { data, isLoading, isFetching, error, refetch } = useApiQuery(
    urlWithQuery,
    { key: ["polls-advanced", urlWithQuery] } as any
  );

  useEffect(() => {
    try {
      (refetch as any)?.();
    } catch {}
  }, [urlWithQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const payload = data?.data?.data ?? {};
  const meta = payload?.meta ?? {};
  const entries: any[] = Array.isArray(payload.entries) ? payload.entries : [];
  console.log("entries", entries);
  const total: number =
    typeof meta.total === "number" ? meta.total : entries.length ?? 0;

  const totalPages: number =
    typeof meta.totalPages === "number" && meta.totalPages > 0
      ? meta.totalPages
      : Math.max(1, Math.ceil((total || 1) / PAGE_SIZE));

  const currentPage: number =
    typeof meta.page === "number" && meta.page > 0 ? meta.page : page;

  const handleViewMore = (id: string, title: string) => {
    navigate(`/analytics/polls/${id}`, { state: { title } });
  };

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

  const handleResetAll = () => {
    usePollFilters.persist?.clearStorage?.();
    reset();
    setTrendingOn(false);
    setTrendingWindow("day");
  };

  const Chip = ({
    label,
    onRemove,
  }: {
    label: string;
    onRemove: () => void;
  }) => (
    <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full border">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="hover:opacity-80 transition"
        aria-label="Remove filter"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );

  const chipBar = (
    <div className="flex flex-wrap gap-2">
      {/* Countries */}
      {countryOpts.map((o, idx) => (
        <Chip
          key={`c-${o.value}-${idx}`}
          label={`Country: ${o.label}`}
          onRemove={() =>
            patch({
              page: 1,
              countryOpts: countryOpts.filter((x) => x.value !== o.value),
            })
          }
        />
      ))}
      {/* States */}
      {stateOpts.map((o, idx) => (
        <Chip
          key={`s-${o.value}-${idx}`}
          label={`State: ${o.label}`}
          onRemove={() =>
            patch({
              page: 1,
              stateOpts: stateOpts.filter((x) => x.value !== o.value),
            })
          }
        />
      ))}
      {/* Cities */}
      {cityOpts.map((o, idx) => (
        <Chip
          key={`ci-${o.value}-${idx}`}
          label={`City: ${o.label}`}
          onRemove={() =>
            patch({
              page: 1,
              cityOpts: cityOpts.filter((x) => x.value !== o.value),
            })
          }
        />
      ))}
      {/* Assets */}
      {assetOpts.map((o, idx) => (
        <Chip
          key={`a-${o.value}-${idx}`}
          label={`Asset: ${o.label}`}
          onRemove={() =>
            patch({
              page: 1,
              assetOpts: assetOpts.filter((x) => x.value !== o.value),
            })
          }
        />
      ))}
      {/* Expired / Exhausted */}
      {expired !== "all" && (
        <Chip
          label={expired === "true" ? "Expired" : "Non-expired"}
          onRemove={() => patch({ page: 1, expired: "all" })}
        />
      )}
      {exhausted !== "all" && (
        <Chip
          label={exhausted === "true" ? "Exhausted" : "Non-exhausted"}
          onRemove={() => patch({ page: 1, exhausted: "all" })}
        />
      )}
      {/* Title search */}
      {search.trim() && (
        <Chip
          label={`Title: "${search.trim()}"`}
          onRemove={() => patch({ page: 1, search: "" })}
        />
      )}
      {/* Trending */}
      {trendingOn && (
        <Chip
          label={`Trending: ${trendingWindow}`}
          onRemove={() => {
            setTrendingOn(false);
            // setTrendingPopoverOpen(false);
            patch({ page: 1 });
          }}
        />
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6 md:px-4 h-full">
      {/* Filter */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold">Polls</h1>
            <p className="text-muted-foreground">
              View detailed analytics of all the polls
            </p>
          </div>
          <div>
            <Button variant="default" onClick={() => navigate("/polls/create")}>
              <Plus /> Create New Poll
            </Button>
          </div>
        </div>

        <div className="flex justify-between w-full gap-2">
          <Input
            className="md:w-[40dvw]"
            placeholder="Search by title…"
            value={search}
            onChange={(e) => patch({ page: 1, search: e.target.value })}
            autoComplete="off"
          />
          <Button variant="secondary" onClick={handleResetAll}>
            Reset Filters
          </Button>
        </div>

        {/* Filters row */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <section className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">Countries</label>
            <CountrySelect
              key={`country-${uiNonce}`}
              value={countryOpts}
              onChange={(opts) => patch({ page: 1, countryOpts: opts })}
              selectProps={{ menuPortalTarget: document.body }}
            />
          </section>

          <section className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">States</label>
            <StateSelect
              key={`state-${uiNonce}`}
              value={stateOpts}
              onChange={(opts) => patch({ page: 1, stateOpts: opts })}
              selectProps={{ menuPortalTarget: document.body }}
            />
          </section>

          <section className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">Cities</label>
            <CitySelect
              key={`city-${uiNonce}`}
              value={cityOpts}
              onChange={(opts) => patch({ page: 1, cityOpts: opts })}
              selectProps={{ menuPortalTarget: document.body }}
            />
          </section>

          <section className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">Assets</label>
            <AssetMultiSelect
              value={assetOpts}
              onChange={(opts) => patch({ page: 1, assetOpts: opts })}
              selectProps={{ menuPortalTarget: document.body }}
            />
          </section>

          <section className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">Expired</label>
            <Select
              value={expired}
              onValueChange={(v: Tri) => patch({ page: 1, expired: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">True</SelectItem>
                <SelectItem value="false">False</SelectItem>
              </SelectContent>
            </Select>
          </section>

          <section className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground">Exhausted</label>
            <Select
              value={exhausted}
              onValueChange={(v: Tri) => patch({ page: 1, exhausted: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="true">True</SelectItem>
                <SelectItem value="false">False</SelectItem>
              </SelectContent>
            </Select>
          </section>
          <section className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground flex items-center gap-2">
              Trending
              <Switch
                checked={trendingOn}
                onCheckedChange={(v) => {
                  setTrendingOn(v);
                  if (v) patch({ page: 1 });
                }}
                aria-label="Toggle Trending"
              />
            </label>

            {trendingOn ? (
              <Select
                value={trendingWindow}
                onValueChange={(v: TrendingWindow) => {
                  setTrendingWindow(v);
                  patch({ page: 1 });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select window" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hour">Hour</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="quarter">Quarter</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="h-9" />
            )}
          </section>
        </section>

        {chipBar}
      </section>

      {error ? (
        <div className="text-red-500 text-sm">Failed to load polls.</div>
      ) : null}

      <div className="flex items-center gap-2">
        {isLoading || isFetching ? (
          <span className="text-sm text-muted-foreground">Loading…</span>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
        {entries?.map((poll: any) => (
          <Card
            key={poll._id}
            className="@container/card bg-primary/5 rounded-3xl flex flex-row justify-between items-center gap-32"
          >
            <CardHeader className="w-full">
              <CardTitle className="text-lg font-semibold @[250px]/card:text-xl overflow-hidden text-ellipsis whitespace-nowrap">
                {poll.title}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {poll.viewCount ?? 0} views • {poll.voteCount ?? 0} votes
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex items-center gap-3">
              <Button
                onClick={() =>
                  navigate(`/polls/${poll._id}`, {
                    state: {
                      isNavigationEditing: true,
                    },
                  })
                }
                variant="outline"
                className="w-full md:h-12 rounded-2xl min-w-32"
              >
                Edit
              </Button>
              <Button
                onClick={() => handleViewMore(poll._id, poll.title)}
                variant="outline"
                className="w-full md:h-12 rounded-2xl min-w-32"
              >
                View More
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Pagination Footer */}
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
                  if (currentPage > 1) patch({ page: currentPage - 1 });
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
                      if (p !== currentPage) patch({ page: p as number });
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
                  if (currentPage < totalPages)
                    patch({ page: currentPage + 1 });
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </section>
    </div>
  );
};

const Polls = memo(MemoPolls);
export default Polls;
