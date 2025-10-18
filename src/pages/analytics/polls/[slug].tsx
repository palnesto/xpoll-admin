import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import {
  Pie,
  PieChart,
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MoveLeftIcon, SlidersVertical, X as XIcon } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiInfiniteQuery } from "@/hooks/useApiInfiniteQuery";
import { endpoints } from "@/api/endpoints";
import {
  ApiOption,
  PALETTE,
  PIE_COLORS,
  PollDetailsResponse,
  sanitizeKey,
} from "@/components/types/pollStatics";
import Select, { MultiValue, components, MenuListProps } from "react-select";
import { usePollDetailsFilters } from "@/stores/usePollDetailsFilters";

type Opt<T = unknown> = { value: string; label: string; data?: T };

function MultiInfiniteSelect<
  T,
  F extends Record<string, unknown> = Record<string, unknown>
>({
  route,
  getFilters,
  mapItemToOption,
  value,
  onChange,
  placeholder = "Search…",
  debounceMs = 300,
  minChars = 0,
  fetchThresholdPx = 120,
}: {
  route: string;
  getFilters?: (search: string) => F;
  mapItemToOption: (item: T) => Opt<T>;
  value: Opt<T>[];
  onChange: (vals: Opt<T>[]) => void;
  placeholder?: string;
  debounceMs?: number;
  minChars?: number;
  fetchThresholdPx?: number;
}) {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => setSearch(input), debounceMs);
    return () => window.clearTimeout(id);
  }, [input, debounceMs]);

  const effectiveSearch = search.length >= minChars ? search : "";
  const filters = useMemo(
    () => (getFilters ? getFilters(effectiveSearch) : ({} as F)),
    [getFilters, effectiveSearch]
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useApiInfiniteQuery<T, unknown, F>(route, filters, 50);

  const options = useMemo<Opt<T>[]>(() => {
    const flat: Opt<T>[] = [];
    for (const p of data?.pages ?? []) {
      for (const item of (p.entries ?? []) as T[]) {
        flat.push(mapItemToOption(item));
      }
    }
    return flat;
  }, [data, mapItemToOption]);

  const lastFetchTsRef = useRef(0);
  const tryFetchNext = () => {
    const now = Date.now();
    if (now - lastFetchTsRef.current < 300) return;
    if (hasNextPage && !isFetchingNextPage) {
      lastFetchTsRef.current = now;
      fetchNextPage();
    }
  };

  const MenuList = (props: MenuListProps<Opt<T>, true>) => {
    const onScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
      const el = e.currentTarget;
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distance < fetchThresholdPx) tryFetchNext();
    };
    return (
      <components.MenuList {...props} onScroll={onScroll}>
        {props.children}
      </components.MenuList>
    );
  };

  return (
    <Select<Opt<T>, true>
      isMulti
      value={value}
      onChange={(vals: MultiValue<Opt<T>>) => onChange(vals as Opt<T>[])}
      options={options}
      inputValue={input}
      onInputChange={(val, meta) => {
        if (meta.action === "input-change") setInput(val);
        return val;
      }}
      placeholder={placeholder}
      isLoading={isLoading || isFetchingNextPage}
      noOptionsMessage={() =>
        isLoading
          ? "Loading..."
          : input && input.length < minChars
          ? `Type at least ${minChars} characters`
          : "No options"
      }
      components={{ MenuList }}
      styles={{
        // placeholder: (base) => ({ ...base, color: "black" }),
        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
        control: (base, state) => ({
          ...base,
          minHeight: 38,
          boxShadow: "none",
          background: "transparent", // ⬅ transparent/black bg so white text shows
          borderColor: "hsl(var(--border))",
          ":hover": { borderColor: "hsl(var(--border))" },
          color: "hsl(var(--foreground))",
        }),
        /* The dropdown panel */
        menu: (base) => ({
          ...base,
          background: "rgba(0,0,0,0.9)", // ⬅ dark backdrop (or "transparent")
          backdropFilter: "blur(4px)",
          border: "1px solid hsl(var(--border))",
        }),

        /* Scroll area inside the dropdown */
        menuList: (base) => ({
          ...base,
          background: "transparent", // ⬅ keep it see-through
          padding: 4,
        }),

        /* Each option row */
        option: (base, state) => ({
          ...base,
          background: state.isFocused ? "hsl(var(--muted))" : "transparent",
          color: "hsl(var(--foreground))",
          ":active": { background: "hsl(var(--muted))" },
        }),

        /* Input text color inside the control */
        input: (base) => ({
          ...base,
          color: "hsl(var(--foreground))", // ⬅ make typed text visible
        }),

        /* Placeholder (when nothing selected/typed) */
        placeholder: (base) => ({
          ...base,
          color: "hsl(var(--muted-foreground))",
        }),
        multiValue: (base) => ({
          ...base,
          borderRadius: 9999,
          background: "hsl(var(--muted))",
        }),
        multiValueLabel: (base) => ({
          ...base,
          color: "hsl(var(--foreground))",
        }),
        multiValueRemove: (base) => ({
          ...base,
          color: "hsl(var(--foreground))",
          ":hover": {
            background: "hsl(var(--destructive))",
            color: "hsl(var(--destructive-foreground))",
          },
        }),

        /* Icons / indicators should match foreground */
        dropdownIndicator: (base) => ({
          ...base,
          color: "hsl(var(--foreground))",
          ":hover": { color: "hsl(var(--foreground))" },
        }),
        clearIndicator: (base) => ({
          ...base,
          color: "hsl(var(--foreground))",
          ":hover": { color: "hsl(var(--foreground))" },
        }),

        /* Container for values + input */
        valueContainer: (base) => ({
          ...base,
          background: "transparent",
        }),
      }}
      menuPortalTarget={document.body}
      menuShouldScrollIntoView={false}
      closeMenuOnSelect={false}
    />
  );
}

const Chip = ({
  children,
  onClear,
  title,
}: {
  children: React.ReactNode;
  onClear: () => void;
  title?: string;
}) => (
  <button
    className="inline-flex items-center gap-1 text-sm px-2.5 py-1.5 rounded-full bg-muted hover:bg-muted/80"
    onClick={onClear}
    title={title || "Remove filter"}
  >
    <span>{children}</span>
    <XIcon className="h-3.5 w-3.5" />
  </button>
);

function ChartPieLegend({ options = [] as ApiOption[] }) {
  const { pieData, pieConfig } = useMemo(() => {
    const cfg: ChartConfig = { visitors: { label: "Votes (cumulative)" } };
    const rows = options.map((opt, i) => {
      const color = PIE_COLORS[i % PIE_COLORS.length];
      const key = sanitizeKey(opt.text || `option-${i + 1}`);
      (cfg as any)[key] = { label: opt.text || `Option ${i + 1}`, color };
      return {
        browser: opt.text || `Option ${i + 1}`,
        visitors: Number(opt.totalCumulative ?? 0),
        fill: `var(--color-${key})`,
        __key: key,
      };
    });
    return { pieData: rows, pieConfig: cfg };
  }, [options]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Pie Chart - Legend</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={pieConfig}
          className="mx-auto md:h-[400px] w-[500px] lg:w-[1000px]"
        >
          <PieChart className="flex">
            <Pie data={pieData} dataKey="visitors" nameKey="browser" />
            <ChartLegend content={<ChartLegendContent nameKey="browser" />} />
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function ChartLineLinearMulti({
  data,
  config,
  xKey = "bucket",
  subtitle,
  title = "Votes over time",
}: {
  data: Array<Record<string, any>>;
  config: ChartConfig;
  xKey?: string;
  subtitle?: string;
  title?: string;
}) {
  // keep only the option series keys
  const seriesKeys = useMemo(
    () =>
      Object.keys(config).filter(
        (k) => !["visitors", "desktop", "mobile"].includes(k)
      ),
    [config]
  );

  // colored tooltip
  const TooltipWithColors = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-md border bg-background p-2 shadow-sm">
        <div className="text-xs mb-1 opacity-70">{label}</div>
        <div className="space-y-1">
          {payload.map((p: any) => {
            const key = p.dataKey as string;
            const colorVar = `var(--color-${key})`;
            const lineLabel = (config as any)[key]?.label ?? key;
            const val = p.value ?? 0;
            return (
              <div key={key} className="flex items-center gap-2 text-sm">
                <span
                  aria-hidden
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ background: colorVar }}
                />
                <span className="whitespace-nowrap">{lineLabel}</span>
                <span className="ml-auto tabular-nums">{val}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ---- INTEGER TICKS (~6 labels) ----
  const yTicks = useMemo(() => {
    // max across series
    let maxY = 0;
    for (const row of data ?? []) {
      for (const key of seriesKeys) {
        const v = Number(row?.[key] ?? 0);
        if (!Number.isNaN(v)) maxY = Math.max(maxY, v);
      }
    }
    // target at least 6 ticks: 0..top with integer step
    const desiredTicks = 6; // -> 5 intervals
    const minTop = 5; // ensure enough labels even for tiny data
    const topTarget = Math.max(minTop, Math.ceil(maxY));
    const step = Math.max(1, Math.ceil(topTarget / (desiredTicks - 1))); // integer step
    const top = step * (desiredTicks - 1); // ensures exactly 6 ticks

    const ticks: number[] = [];
    for (let t = 0; t <= top; t += step) ticks.push(t);
    return ticks;
  }, [data, seriesKeys]);

  const formatTick = (n: number) => `${n | 0}`; // always integer text

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={config}
          className="mx-auto md:h-[400px] w-[500px] lg:w-[1000px]"
        >
          <LineChart
            accessibilityLayer
            data={data}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              ticks={yTicks}
              tickFormatter={formatTick}
              tickLine={false}
              axisLine={false}
              width={46}
              tickMargin={6}
            />
            <ChartTooltip cursor={false} content={<TooltipWithColors />} />
            {seriesKeys.map((key) => (
              <Line
                key={key}
                dataKey={key}
                type="linear"
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

const PollsRanks = ({
  distribution,
}: {
  distribution: Array<{ level: number; count: number }>;
}) => {
  const ranks = distribution?.length ? distribution : [];
  if (!ranks.length) return null;

  return (
    <article className="flex flex-row gap-4 overflow-x-auto">
      {ranks.map(({ level, count }) => (
        <Card
          key={level}
          className="@container/card bg-primary/5 rounded-3xl w-32"
        >
          <CardHeader>
            <CardDescription className="text-muted-foreground text-lg w-64">
              Level {level}
            </CardDescription>
            <CardTitle className="text-xl font-semibold @[250px]/card:text-3xl">
              {count}
            </CardTitle>
          </CardHeader>
        </Card>
      ))}
    </article>
  );
};

const MemoIndividualPolls = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { slug = "" } = useParams<{ slug: string }>();

  const [panelOpen, setPanelOpen] = useState(false);

  const [countryOpts, setCountryOpts] = useState<Opt[]>([]);
  const [stateOpts, setStateOpts] = useState<Opt[]>([]);
  const [cityOpts, setCityOpts] = useState<Opt[]>([]);
  const [granularity, setGranularity] = useState<
    "hour" | "day" | "week" | "month"
  >("day");
  const [includeArchived, setIncludeArchived] = useState(false);

  const filtersStore = usePollDetailsFilters();

  const didHydrateRef = useRef(false);
  useEffect(() => {
    if (!filtersStore._hydrated || didHydrateRef.current) return;
    didHydrateRef.current = true;
    setCountryOpts(filtersStore.countryOpts || []);
    setStateOpts(filtersStore.stateOpts || []);
    setCityOpts(filtersStore.cityOpts || []);
    setGranularity(filtersStore.granularity || "day");
    setIncludeArchived(!!filtersStore.includeArchived);
  }, [filtersStore._hydrated]);

  useEffect(() => {
    if (!didHydrateRef.current) return;
    filtersStore.patch({
      countryOpts,
      stateOpts,
      cityOpts,
      granularity,
      includeArchived,
    });
  }, [countryOpts, stateOpts, cityOpts, granularity, includeArchived]); // eslint-disable-line

  const handleBack = () => {
    navigate(`/analytics/polls`);
  };

  const detailsUrl = useMemo(() => {
    if (!slug) return "";
    const base = endpoints.entities.polls.getdetailsById(String(slug));
    const usp = new URLSearchParams();

    const joinVals = (opts: Opt[]) =>
      opts.length ? opts.map((o) => o.value).join(",") : "";

    const countries = joinVals(countryOpts);
    const states = joinVals(stateOpts);
    const cities = joinVals(cityOpts);

    if (countries) usp.set("countries", countries);
    if (states) usp.set("states", states);
    if (cities) usp.set("cities", cities);
    if (granularity) usp.set("granularity", granularity);
    usp.set("includeArchived", includeArchived ? "true" : "false");

    const qs = usp.toString();
    return qs ? `${base}?${qs}` : base;
  }, [slug, countryOpts, stateOpts, cityOpts, granularity, includeArchived]);

  const { data, isLoading, error, refetch } = useApiQuery(detailsUrl, {
    key: ["poll-details", detailsUrl],
  } as any);

  useEffect(() => {
    try {
      (refetch as any)?.();
    } catch {}
  }, [detailsUrl]);

  const api: PollDetailsResponse | undefined = data?.data?.data;

  const totals = api?.stats?.stats;
  const totalsCards = [
    { label: "Total Views", value: totals?.totalViews ?? 0 },
    { label: "Total Participants", value: totals?.totalVoters ?? 0 },
    { label: "Rewards Claimed", value: totals?.totalRewardsClaimed ?? 0 },
  ];

  const { cumulativeRows, countRows, configCumulative, configCount, subtitle } =
    useMemo(() => {
      const opts = api?.optionDistribution?.options ?? [];

      const bucketSet = new Set<string>();
      opts.forEach((opt) =>
        opt.series?.forEach((p) => bucketSet.add(p.bucket))
      );
      const buckets = Array.from(bucketSet).sort();

      const rowsCum: Array<Record<string, any>> = buckets.map((b) => ({
        bucket: formatBucketLabel(b, api?.optionDistribution?.granularity),
      }));
      const rowsCnt: Array<Record<string, any>> = buckets.map((b) => ({
        bucket: formatBucketLabel(b, api?.optionDistribution?.granularity),
      }));

      const cfgCum: ChartConfig = {};
      const cfgCnt: ChartConfig = {};

      opts.forEach((opt, idx) => {
        const color = PALETTE[idx % PALETTE.length];
        const key = sanitizeKey(opt.text || `opt_${idx + 1}`);
        (cfgCum as any)[key] = {
          label: opt.text || `Option ${idx + 1}`,
          color,
        };
        (cfgCnt as any)[key] = {
          label: opt.text || `Option ${idx + 1}`,
          color,
        };

        const byBucketCum = new Map<string, number>();
        const byBucketCnt = new Map<string, number>();
        opt.series?.forEach((p) => {
          byBucketCum.set(p.bucket, p.cumulative ?? 0);
          byBucketCnt.set(p.bucket, p.count ?? 0);
        });

        buckets.forEach((b, i) => {
          (rowsCum[i] as any)[key] = byBucketCum.get(b) ?? 0;
          (rowsCnt[i] as any)[key] = byBucketCnt.get(b) ?? 0;
        });
      });

      const sub =
        api?.optionDistribution?.granularity === "hour"
          ? "Hourly"
          : api?.optionDistribution?.granularity === "day"
          ? "Daily"
          : api?.optionDistribution?.granularity === "week"
          ? "Weekly"
          : "Monthly";

      return {
        cumulativeRows: rowsCum,
        countRows: rowsCnt,
        configCumulative: cfgCum,
        configCount: cfgCnt,
        subtitle: sub,
      };
    }, [
      api?.optionDistribution?.options,
      api?.optionDistribution?.granularity,
    ]);

  const levelDist = api?.levelDistribution?.distribution ?? [];

  const mapCountry = (item: any): Opt => ({
    value: item._id as string,
    label: item.name || item.iso2 || item.code || item._id,
    data: item,
  });
  const mapState = (item: any): Opt => ({
    value: item._id as string,
    label: item.code ? `${item.name} (${item.code})` : item.name || item.code,
    data: item,
  });
  const mapCity = (item: any): Opt => ({
    value: item._id as string,
    label: item.name || item.code,
    data: item,
  });

  const FiltersBox = () => (
    <div className="absolute right-0 mt-2 w-[36rem] max-w-[95vw] bg-background border rounded-xl shadow-lg z-50">
      <Accordion
        type="single"
        collapsible
        value="filters"
        className="rounded-xl"
        defaultValue="filters"
      >
        <AccordionItem value="filters" className="border-none">
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <span className="font-medium">Filters</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-0">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm">Countries</label>
                <MultiInfiniteSelect
                  route="/common/location/countries"
                  getFilters={(q) => ({ q })}
                  mapItemToOption={mapCountry}
                  value={countryOpts}
                  onChange={(opts) => setCountryOpts(opts)}
                  placeholder="Search countries…"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm">States</label>
                <MultiInfiniteSelect
                  route="/common/location/states"
                  getFilters={(q) => ({ q })}
                  mapItemToOption={mapState}
                  value={stateOpts}
                  onChange={(opts) => setStateOpts(opts)}
                  placeholder="Search states…"
                />
              </div>

              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-sm">Cities</label>
                <MultiInfiniteSelect
                  route="/common/location/cities"
                  getFilters={(q) => ({ q })}
                  mapItemToOption={mapCity}
                  value={cityOpts}
                  onChange={(opts) => setCityOpts(opts)}
                  placeholder="Search cities…"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm">Granularity</label>
                <div className="flex flex-wrap gap-2">
                  {(["hour", "day", "week", "month"] as const).map((g) => (
                    <button
                      key={g}
                      className={`text-sm px-2.5 py-1.5 rounded-full border ${
                        granularity === g
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setGranularity(g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <input
                  id="include-archived"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={includeArchived}
                  onChange={(e) => setIncludeArchived(e.target.checked)}
                />
                <label htmlFor="include-archived" className="text-sm">
                  Include archived votes
                </label>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );

  const Header = () => (
    <section className="flex justify-between items-center mb-4 relative">
      <section className="flex items-center gap-2">
        <MoveLeftIcon
          onClick={handleBack}
          className="text-muted-foreground cursor-pointer"
        />
        <h1 className="text-xl font-bold">
          {location.state?.title || api?.stats?.title || "Poll details"}
        </h1>
      </section>

      <div className="relative">
        <button
          type="button"
          onClick={() => setPanelOpen((s) => !s)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Filters"
        >
          <SlidersVertical />
        </button>
        {panelOpen && <FiltersBox />}
      </div>
    </section>
  );

  const ChipsBar = () => {
    const chips: JSX.Element[] = [];

    countryOpts.forEach((o, idx) =>
      chips.push(
        <Chip
          key={`country-${o.value}-${idx}`}
          onClear={() =>
            setCountryOpts((arr) => arr.filter((x) => x.value !== o.value))
          }
          title="Remove country"
        >
          Country: {o.value}
        </Chip>
      )
    );
    stateOpts.forEach((o, idx) =>
      chips.push(
        <Chip
          key={`state-${o.value}-${idx}`}
          onClear={() =>
            setStateOpts((arr) => arr.filter((x) => x.value !== o.value))
          }
          title="Remove state"
        >
          State: {o.value}
        </Chip>
      )
    );
    cityOpts.forEach((o, idx) =>
      chips.push(
        <Chip
          key={`city-${o.value}-${idx}`}
          onClear={() =>
            setCityOpts((arr) => arr.filter((x) => x.value !== o.value))
          }
          title="Remove city"
        >
          City: {o.value}
        </Chip>
      )
    );
    if (granularity && granularity !== "day") {
      chips.push(
        <Chip key={`gran-${granularity}`} onClear={() => setGranularity("day")}>
          Granularity: {granularity}
        </Chip>
      );
    }
    if (includeArchived) {
      chips.push(
        <Chip key="archived" onClear={() => setIncludeArchived(false)}>
          Include archived
        </Chip>
      );
    }

    if (!chips.length) return null;
    return (
      <div className="flex flex-wrap items-center gap-2 mb-4">{chips}</div>
    );
  };

  return (
    <section className="p-6">
      <Header />
      <ChipsBar />

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : null}
      {error ? (
        <div className="text-sm text-red-500">Failed to load details.</div>
      ) : null}

      <article className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {totalsCards.map(({ label, value }) => (
          <Card
            key={label}
            className="@container/card bg-primary/5 rounded-3xl"
          >
            <CardHeader>
              <CardDescription className="text-muted-foreground text-lg w-64">
                {label}
              </CardDescription>
              <CardTitle className="text-xl font-semibold @[250px]/card:text-3xl">
                {value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </article>

      <article className="my-4">
        <ChartPieLegend options={api?.optionDistribution?.options ?? []} />
      </article>

      <section className="space-y-4">
        <PollsRanks distribution={api?.levelDistribution?.distribution ?? []} />
      </section>

      <section className="my-4 space-y-6">
        <ChartLineLinearMulti
          data={cumulativeRows}
          config={configCumulative}
          subtitle={`${subtitle} • cumulative`}
          title="Cumulative votes over time"
        />
        <ChartLineLinearMulti
          data={countRows}
          config={configCount}
          subtitle={`${subtitle} • count (per bucket)`}
          title="New votes per bucket"
        />
      </section>
    </section>
  );
};

function formatBucketLabel(bucketIso: string, granularity?: string) {
  try {
    const d = new Date(bucketIso);
    if (granularity === "hour") {
      return d.toLocaleString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short",
      });
    }
    return d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return bucketIso;
  }
}

const IndividualPolls = memo(MemoIndividualPolls);
export default IndividualPolls;
