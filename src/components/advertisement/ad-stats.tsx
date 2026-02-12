// src/components/advertisement/ad-stats.tsx

import React, { useMemo, useState } from "react";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

import { LEVELS } from "@/utils/levelConfig";
import { Alert, AlertDescription } from "../ui/alert";

export const BASIS = {
  VISIT: "visit",
  CLICK: "click",
} as const;

type Basis = (typeof BASIS)[keyof typeof BASIS];

type MetricMode = "total" | "unique";

type Totals = { total: number; unique: number };

type CountryRow = {
  _id: string;
  name?: string | null;
  iso3?: string | null;
  visits: Totals;
  clicks: Totals;
};

type StateRow = {
  _id: string;
  name?: string | null;
  countryId?: string | null;
  iso_3166_2?: string | null;
  visits: Totals;
  clicks: Totals;
};

type CityRow = {
  _id: string;
  name?: string | null;
  stateId?: string | null;
  countryId?: string | null;
  stateName?: string | null;
  countryName?: string | null;
  visits: Totals;
  clicks: Totals;
};

type LevelWise = Record<
  string,
  {
    visits: Totals;
    clicks: Totals;
  }
>;

type AdMini = {
  _id: string;
  adOwnerId: string;
  title: string;
  status?: string | null;
  archivedAt?: string | null;
  createdAt?: string;
};

type AdStatsPayload = {
  ad: AdMini;
  visits: Totals;
  clicks: Totals;
  levelWise?: LevelWise;
  countryWise?: CountryRow[];
  stateWise?: StateRow[];
  cityWise?: CityRow[];
};

function safeNum(n: any): number {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function getBasisTotals(
  row: { visits: Totals; clicks: Totals },
  basis: Basis,
): Totals {
  return basis === BASIS.VISIT ? row.visits : row.clicks;
}

function getLabelForWindow(
  windowStartTime: string | null,
  windowEndTime: string | null,
) {
  if (!windowStartTime && !windowEndTime) return "All-time";
  const fmt = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  };
  if (windowStartTime && windowEndTime)
    return `${fmt(windowStartTime)} → ${fmt(windowEndTime)}`;
  if (windowStartTime) return `From ${fmt(windowStartTime)}`;
  return `Until ${fmt(windowEndTime!)}`;
}

/**
 * UI uses datetime-local for convenience.
 * Backend expects query param parsable by dateSchema (your dateSchema already handles query strings).
 * We send ISO strings to be safe.
 */
function datetimeLocalToISO(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

type DistPoint = {
  key: string;
  name: string;
  value: number;
  pct: number; // 0-100
};

function buildDistribution<T extends { _id: string }>(
  rows: T[],
  basis: Basis,
  metric: MetricMode,
  getName: (row: T) => string,
  getCounts: (row: T) => Totals,
): DistPoint[] {
  const values = rows.map((r) => {
    const totals = getCounts(r);
    const v =
      metric === "total" ? safeNum(totals.total) : safeNum(totals.unique);
    return {
      key: String(r._id),
      name: getName(r),
      value: v,
    };
  });

  const sum = values.reduce((acc, v) => acc + v.value, 0);
  return values.map((v) => ({
    ...v,
    pct: sum > 0 ? (v.value / sum) * 100 : 0,
  }));
}

/* ----------------------------- styling helpers ---------------------------- */

const CHART_COLORS = [
  "hsl(217 91% 60%)", // blue
  "hsl(142 71% 45%)", // green
  "hsl(0 84% 60%)", // red
  "hsl(43 96% 56%)", // amber
  "hsl(262 83% 58%)", // violet
  "hsl(199 89% 48%)", // cyan
  "hsl(330 81% 60%)", // pink
  "hsl(24 95% 53%)", // orange
  "hsl(160 84% 39%)", // emerald
  "hsl(188 86% 53%)", // sky
];

function colorForIndex(idx: number) {
  return CHART_COLORS[idx % CHART_COLORS.length];
}

function truncateEnd(s: string, max: number) {
  const str = String(s ?? "");
  if (str.length <= max) return str;
  if (max <= 1) return "…";
  return `${str.slice(0, max - 1)}…`;
}

/**
 * Axis labels are the #1 thing breaking at multiple viewports (from your screenshots).
 * Keep them readable: truncate + keep full name in tooltip + keep full name in breakdown list.
 */
function formatAxisLabel(label: string, max = 18) {
  const s = String(label ?? "");
  if (s.length <= max) return s;

  // If "Name (State, Country)" try to keep the structure visible.
  const open = s.indexOf("(");
  if (open > 0) {
    const head = s.slice(0, open).trim();
    const tail = s.slice(open).trim();
    const headMax = Math.max(8, Math.floor(max * 0.55));
    const tailMax = Math.max(6, max - headMax - 1);
    return `${truncateEnd(head, headMax)} ${truncateEnd(tail, tailMax)}`;
  }
  return truncateEnd(s, max);
}

const AXIS_STROKE = "hsl(var(--border))";
const TICK_FILL = "hsl(var(--muted-foreground))";

/* -------------------------------- UI bits -------------------------------- */

function TopSummaryRow({
  title,
  total,
  unique,
  mode,
}: {
  title: string;
  total: number;
  unique: number;
  mode: MetricMode;
}) {
  return (
    <div className="rounded-2xl border bg-background p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm font-semibold">{title}</div>
        <Badge variant="secondary" className="text-xs">
          {mode === "total" ? "Total" : "Unique"}
        </Badge>
      </div>

      <div className="mt-3 flex items-end gap-3">
        <div className="text-3xl font-semibold tabular-nums">
          {mode === "total" ? total : unique}
        </div>
        <div className="text-xs text-muted-foreground pb-1 tabular-nums">
          {mode === "total" ? `Unique: ${unique}` : `Total: ${total}`}
        </div>
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="rounded-2xl border bg-background p-4 space-y-3">
      <Skeleton className="h-4 w-44" />
      <Skeleton className="h-6 w-72" />
      <Skeleton className="h-56 w-full" />
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  right,
}: {
  title: string;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-3xl">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {subtitle ? (
              <div className="text-xs text-muted-foreground mt-1">
                {subtitle}
              </div>
            ) : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}

function TooltipValue({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const p = payload[0]?.payload;
  const color =
    payload[0]?.color ||
    payload[0]?.fill ||
    payload[0]?.payload?.fill ||
    "hsl(var(--foreground))";

  return (
    <div className="rounded-xl border bg-background/95 px-3 py-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <div className="text-xs font-medium max-w-[260px] truncate">
          {label ?? p?.name ?? "—"}
        </div>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground tabular-nums">
          {safeNum(p?.value)}
        </span>{" "}
        <span className="tabular-nums">({safeNum(p?.pct).toFixed(1)}%)</span>
      </div>
    </div>
  );
}

function DistributionCharts({
  title,
  windowLabel,
  basis,
  metric,
  data,
  barLabel,
}: {
  title: string;
  windowLabel: string;
  basis: Basis;
  metric: MetricMode;
  data: DistPoint[];
  barLabel: string;
}) {
  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* BAR */}
      <div className="rounded-2xl border bg-background p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{title} — Bar</div>
            <div className="text-xs text-muted-foreground mt-1">
              {windowLabel} · Basis:{" "}
              <span className="font-medium">{basis}</span> · Mode:{" "}
              <span className="font-medium">{metric}</span> · Total:{" "}
              <span className="font-medium tabular-nums">{total}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 10, bottom: 48, left: 6 }}
              barCategoryGap="22%"
            >
              <CartesianGrid
                stroke={AXIS_STROKE}
                strokeOpacity={0.35}
                strokeDasharray="4 4"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: TICK_FILL }}
                axisLine={{ stroke: AXIS_STROKE, strokeOpacity: 0.7 }}
                tickLine={{ stroke: AXIS_STROKE, strokeOpacity: 0.7 }}
                interval={0}
                angle={-22}
                tickMargin={10}
                height={70}
                tickFormatter={(v: any) => formatAxisLabel(String(v), 18)}
              />
              <YAxis
                tick={{ fontSize: 11, fill: TICK_FILL }}
                axisLine={{ stroke: AXIS_STROKE, strokeOpacity: 0.7 }}
                tickLine={{ stroke: AXIS_STROKE, strokeOpacity: 0.7 }}
              />
              <ReTooltip
                content={<TooltipValue />}
                cursor={{ fill: AXIS_STROKE, opacity: 0.12 }}
              />
              <Bar
                dataKey="value"
                name={barLabel}
                radius={[10, 10, 4, 4]}
                maxBarSize={56}
              >
                {data.map((_, idx) => (
                  <Cell key={idx} fill={colorForIndex(idx)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {data.map((d, idx) => (
            <div
              key={d.key}
              className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] text-muted-foreground"
              title={d.name}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: colorForIndex(idx) }}
              />
              <span className="max-w-[180px] truncate">{d.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* PIE */}
      <div className="rounded-2xl border bg-background p-4">
        <div className="text-sm font-semibold">{title} — Pie</div>
        <div className="text-xs text-muted-foreground mt-1">
          {windowLabel} · Basis: <span className="font-medium">{basis}</span> ·
          Mode: <span className="font-medium">{metric}</span>
        </div>

        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <ReTooltip
                content={<TooltipValue />}
                cursor={{ fill: AXIS_STROKE, opacity: 0.12 }}
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={94}
                paddingAngle={3}
                startAngle={90}
                endAngle={-270}
                stroke="hsl(var(--background))"
                strokeWidth={2}
              >
                {data.map((_, idx) => (
                  <Cell key={idx} fill={colorForIndex(idx)} />
                ))}
              </Pie>

              {/* Center label: improves readability without changing data/behavior */}
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="hsl(var(--foreground))"
              >
                <tspan
                  x="50%"
                  dy="-2"
                  className="text-sm font-semibold tabular-nums"
                >
                  {total}
                </tspan>
                <tspan
                  x="50%"
                  dy="16"
                  fill="hsl(var(--muted-foreground))"
                  className="text-[11px]"
                >
                  {metric === "total" ? "Total" : "Unique"}
                </tspan>
              </text>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Breakdown list (now color-mapped to pie slices) */}
        <div className="mt-3 grid grid-cols-1 gap-2">
          {data.map((d, idx) => (
            <div
              key={d.key}
              className="flex items-center justify-between gap-3 text-xs rounded-xl border px-3 py-2 hover:bg-accent/40 transition-colors"
              title={d.name}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: colorForIndex(idx) }}
                />
                <div className="truncate">{d.name}</div>
              </div>
              <div className="shrink-0 tabular-nums text-right">
                <span className="font-semibold">{d.value}</span>{" "}
                <span className="text-muted-foreground">
                  ({d.pct.toFixed(1)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LevelWiseSection({
  levelWise,
  basis,
  metric,
  windowLabel,
}: {
  levelWise: LevelWise;
  basis: Basis;
  metric: MetricMode;
  windowLabel: string;
}) {
  const rows = Object.entries(levelWise || {})
    .map(([levelId, v]) => {
      const lvl = LEVELS.find((x) => x.id === Number(levelId));
      const totals = getBasisTotals(v, basis);
      const value =
        metric === "total" ? safeNum(totals.total) : safeNum(totals.unique);
      return {
        key: String(levelId),
        name: lvl?.title ? `L${levelId} — ${lvl.title}` : `L${levelId}`,
        value,
        pct: 0,
      };
    })
    .sort((a, b) => Number(a.key) - Number(b.key));

  const sum = rows.reduce((acc, r) => acc + r.value, 0);
  const data = rows.map((r) => ({
    ...r,
    pct: sum > 0 ? (r.value / sum) * 100 : 0,
  }));

  return (
    <SectionCard
      title="Level-wise distribution"
      subtitle={
        <>
          {windowLabel} · Basis: <span className="font-medium">{basis}</span> ·
          Mode: <span className="font-medium">{metric}</span>
        </>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-background p-4">
          <div className="text-sm font-semibold">Bar</div>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 8, right: 10, bottom: 46, left: 6 }}
                barCategoryGap="26%"
              >
                <CartesianGrid
                  stroke={AXIS_STROKE}
                  strokeOpacity={0.35}
                  strokeDasharray="4 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: TICK_FILL }}
                  axisLine={{ stroke: AXIS_STROKE, strokeOpacity: 0.7 }}
                  tickLine={{ stroke: AXIS_STROKE, strokeOpacity: 0.7 }}
                  interval={0}
                  angle={-18}
                  tickMargin={10}
                  height={70}
                  tickFormatter={(v: any) => formatAxisLabel(String(v), 22)}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: TICK_FILL }}
                  axisLine={{ stroke: AXIS_STROKE, strokeOpacity: 0.7 }}
                  tickLine={{ stroke: AXIS_STROKE, strokeOpacity: 0.7 }}
                />
                <ReTooltip
                  content={<TooltipValue />}
                  cursor={{ fill: AXIS_STROKE, opacity: 0.12 }}
                />
                <Bar dataKey="value" radius={[10, 10, 4, 4]} maxBarSize={56}>
                  {data.map((_, idx) => (
                    <Cell key={idx} fill={colorForIndex(idx)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border bg-background p-4">
          <div className="text-sm font-semibold">Breakdown</div>
          <div className="mt-3 grid grid-cols-1 gap-2">
            {data.map((d, idx) => (
              <div
                key={d.key}
                className="flex items-center justify-between gap-3 text-xs rounded-xl border px-3 py-2 hover:bg-accent/40 transition-colors"
                title={d.name}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: colorForIndex(idx) }}
                  />
                  <div className="truncate pr-3">{d.name}</div>
                </div>
                <div className="shrink-0 tabular-nums text-right">
                  <span className="font-semibold">{d.value}</span>{" "}
                  <span className="text-muted-foreground">
                    ({d.pct.toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

export const AdStats = ({ adId }: { adId: string }) => {
  const [basis, setBasis] = useState<Basis>(BASIS.VISIT);
  const [metric, setMetric] = useState<MetricMode>("total");

  const [window, setWindow] = useState<{
    windowStartTime: string | null;
    windowEndTime: string | null;
  }>({
    windowStartTime: null,
    windowEndTime: null,
  });

  const windowLabel = useMemo(
    () => getLabelForWindow(window.windowStartTime, window.windowEndTime),
    [window.windowStartTime, window.windowEndTime],
  );

  const windowError = useMemo(() => {
    if (window.windowStartTime && window.windowEndTime) {
      const a = new Date(window.windowStartTime).getTime();
      const b = new Date(window.windowEndTime).getTime();
      if (Number.isFinite(a) && Number.isFinite(b) && a > b) {
        return "Start time must be before (or equal to) end time.";
      }
    }
    return null;
  }, [window.windowStartTime, window.windowEndTime]);

  const url = useMemo(() => {
    const queryParams: Record<string, string> = {
      adIds: adId,
      includeArchived: "true",
      includeCountryWise: "true",
      includeStateWise: "true",
      includeCityWise: "true",
      includeLevelWise: "true",
      basis,
    };

    if (!windowError) {
      if (window.windowStartTime)
        queryParams.windowStartTime = window.windowStartTime;
      if (window.windowEndTime)
        queryParams.windowEndTime = window.windowEndTime;
    }

    return endpoints.entities.ad.ad.stats(queryParams);
  }, [adId, basis, window.windowStartTime, window.windowEndTime, windowError]);

  const { data, isLoading, isFetching, error } = useApiQuery(url, {
    enabled: !!adId,
  } as any);

  const payload: AdStatsPayload | null = useMemo(() => {
    const arr = (data as any)?.data?.data;
    if (!Array.isArray(arr) || arr.length === 0) return null;

    for (const row of arr) {
      if (row && typeof row === "object" && row[adId]) {
        return row[adId] as AdStatsPayload;
      }
    }
    const first = arr[0];
    if (first && typeof first === "object") {
      const k = Object.keys(first)[0];
      if (k && first[k]) return first[k] as AdStatsPayload;
    }
    return null;
  }, [data, adId]);

  const busy = isLoading || isFetching;

  const topVisits = payload?.visits ?? { total: 0, unique: 0 };
  const topClicks = payload?.clicks ?? { total: 0, unique: 0 };

  const countryWise = payload?.countryWise ?? [];
  const stateWise = payload?.stateWise ?? [];
  const cityWise = payload?.cityWise ?? [];
  const levelWise = payload?.levelWise ?? {};

  const countryDist = useMemo(
    () =>
      buildDistribution(
        countryWise,
        basis,
        metric,
        (r) => r.name || r._id,
        (r) => getBasisTotals(r, basis),
      ),
    [countryWise, basis, metric],
  );

  const stateDist = useMemo(
    () =>
      buildDistribution(
        stateWise,
        basis,
        metric,
        (r) => r.name || r._id,
        (r) => getBasisTotals(r, basis),
      ),
    [stateWise, basis, metric],
  );

  const cityDist = useMemo(
    () =>
      buildDistribution(
        cityWise,
        basis,
        metric,
        (r) => {
          const name = r.name || r._id;
          const suffix =
            r.stateName || r.countryName
              ? ` (${[r.stateName, r.countryName].filter(Boolean).join(", ")})`
              : "";
          return `${name}${suffix}`;
        },
        (r) => getBasisTotals(r, basis),
      ),
    [cityWise, basis, metric],
  );

  return (
    <div className="space-y-6">
      {/* Header / Controls */}
      <Card className="rounded-3xl">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold">
                Ad analytics
              </CardTitle>
              <div className="text-xs text-muted-foreground mt-1">
                Window: <span className="font-medium">{windowLabel}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              {/* Basis switch */}
              <div className="flex items-center gap-2 rounded-2xl border bg-background px-3 py-2">
                <Label className="text-xs text-muted-foreground w-16">
                  Basis
                </Label>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-xs",
                      basis === BASIS.VISIT
                        ? "font-semibold"
                        : "text-muted-foreground",
                    )}
                  >
                    Visit
                  </span>
                  <Switch
                    checked={basis === BASIS.CLICK}
                    onCheckedChange={(v) =>
                      setBasis(v ? BASIS.CLICK : BASIS.VISIT)
                    }
                    aria-label="Toggle basis"
                  />
                  <span
                    className={cn(
                      "text-xs",
                      basis === BASIS.CLICK
                        ? "font-semibold"
                        : "text-muted-foreground",
                    )}
                  >
                    Click
                  </span>
                </div>
              </div>

              {/* Metric (total/unique) */}
              <div className="flex items-center gap-2 rounded-2xl border bg-background px-3 py-2">
                <Label className="text-xs text-muted-foreground w-16">
                  Metric
                </Label>
                <Select
                  value={metric}
                  onValueChange={(v) => setMetric(v as MetricMode)}
                >
                  <SelectTrigger className="h-8 w-[140px] rounded-xl">
                    <SelectValue placeholder="Select metric" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total">Total</SelectItem>
                    <SelectItem value="unique">Unique</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator className="mt-4" />

          {/* Window inputs */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border bg-background p-3">
              <Label className="text-xs text-muted-foreground">
                Start time (optional)
              </Label>
              <input
                className={cn(
                  "mt-2 w-full h-9 rounded-xl border bg-transparent px-3 text-sm outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                )}
                type="datetime-local"
                value={
                  window.windowStartTime
                    ? isoToDatetimeLocal(window.windowStartTime)
                    : ""
                }
                onChange={(e) => {
                  const iso = datetimeLocalToISO(e.target.value);
                  setWindow((w) => ({ ...w, windowStartTime: iso }));
                }}
              />
              <div className="mt-2 text-[11px] text-muted-foreground">
                Uses map.createdAt window filter (server-side).
              </div>
            </div>

            <div className="rounded-2xl border bg-background p-3">
              <Label className="text-xs text-muted-foreground">
                End time (optional)
              </Label>
              <input
                className={cn(
                  "mt-2 w-full h-9 rounded-xl border bg-transparent px-3 text-sm outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                )}
                type="datetime-local"
                value={
                  window.windowEndTime
                    ? isoToDatetimeLocal(window.windowEndTime)
                    : ""
                }
                onChange={(e) => {
                  const iso = datetimeLocalToISO(e.target.value);
                  setWindow((w) => ({ ...w, windowEndTime: iso }));
                }}
              />
              <div className="mt-2 text-[11px] text-muted-foreground">
                If both set, start must be ≤ end.
              </div>
            </div>

            <div className="rounded-2xl border bg-background p-3 flex flex-col justify-between">
              <div>
                <Label className="text-xs text-muted-foreground">
                  Quick actions
                </Label>
                <div className="mt-2 text-sm">
                  <div className="text-xs text-muted-foreground">
                    Clear window to see all-time stats.
                  </div>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="h-9 px-3 rounded-xl border text-sm hover:bg-accent"
                  onClick={() =>
                    setWindow({ windowStartTime: null, windowEndTime: null })
                  }
                >
                  Clear
                </button>

                <button
                  type="button"
                  className="h-9 px-3 rounded-xl border text-sm hover:bg-accent"
                  onClick={() => {
                    const now = new Date();
                    const start = new Date(
                      now.getTime() - 7 * 24 * 60 * 60 * 1000,
                    );
                    setWindow({
                      windowStartTime: start.toISOString(),
                      windowEndTime: now.toISOString(),
                    });
                  }}
                >
                  Last 7 days
                </button>
              </div>
            </div>
          </div>

          {windowError ? (
            <div className="mt-3">
              <Alert variant="destructive" className="rounded-2xl">
                <AlertDescription>{windowError}</AlertDescription>
              </Alert>
            </div>
          ) : null}

          {error ? (
            <div className="mt-3">
              <Alert variant="destructive" className="rounded-2xl">
                <AlertDescription>Failed to load stats.</AlertDescription>
              </Alert>
            </div>
          ) : null}
        </CardHeader>
      </Card>

      {/* Top totals */}
      {busy ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TopSummaryRow
            title="Visits"
            total={safeNum(topVisits.total)}
            unique={safeNum(topVisits.unique)}
            mode={metric}
          />
          <TopSummaryRow
            title="Clicks"
            total={safeNum(topClicks.total)}
            unique={safeNum(topClicks.unique)}
            mode={metric}
          />
        </div>
      )}

      {/* Level-wise */}
      {busy ? (
        <ChartSkeleton />
      ) : Object.keys(levelWise || {}).length ? (
        <LevelWiseSection
          levelWise={levelWise}
          basis={basis}
          metric={metric}
          windowLabel={windowLabel}
        />
      ) : (
        <SectionCard
          title="Level-wise distribution"
          subtitle={`${windowLabel} · No level-wise data returned.`}
        >
          <div className="text-sm text-muted-foreground">—</div>
        </SectionCard>
      )}

      {/* Country-wise */}
      {busy ? (
        <ChartSkeleton />
      ) : (
        <SectionCard
          title="Country-wise distribution"
          subtitle={`${windowLabel} · Showing server TOP_STATS results`}
          right={
            <Badge variant="secondary" className="text-xs">
              {countryWise.length} rows
            </Badge>
          }
        >
          {countryWise.length ? (
            <DistributionCharts
              title="Countries"
              windowLabel={windowLabel}
              basis={basis}
              metric={metric}
              data={countryDist}
              barLabel="Count"
            />
          ) : (
            <div className="text-sm text-muted-foreground">
              No country-wise data.
            </div>
          )}
        </SectionCard>
      )}

      {/* State-wise */}
      {busy ? (
        <ChartSkeleton />
      ) : (
        <SectionCard
          title="State-wise distribution"
          subtitle={`${windowLabel} · Showing server TOP_STATS results`}
          right={
            <Badge variant="secondary" className="text-xs">
              {stateWise.length} rows
            </Badge>
          }
        >
          {stateWise.length ? (
            <DistributionCharts
              title="States"
              windowLabel={windowLabel}
              basis={basis}
              metric={metric}
              data={stateDist}
              barLabel="Count"
            />
          ) : (
            <div className="text-sm text-muted-foreground">
              No state-wise data.
            </div>
          )}
        </SectionCard>
      )}

      {/* City-wise */}
      {busy ? (
        <ChartSkeleton />
      ) : (
        <SectionCard
          title="City-wise distribution"
          subtitle={`${windowLabel} · Showing server TOP_STATS results`}
          right={
            <Badge variant="secondary" className="text-xs">
              {cityWise.length} rows
            </Badge>
          }
        >
          {cityWise.length ? (
            <DistributionCharts
              title="Cities"
              windowLabel={windowLabel}
              basis={basis}
              metric={metric}
              data={cityDist}
              barLabel="Count"
            />
          ) : (
            <div className="text-sm text-muted-foreground">
              No city-wise data.
            </div>
          )}
        </SectionCard>
      )}

      {/* Footer loading hint */}
      {busy ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Skeleton className="h-4 w-4 rounded-full" />
          <span>Loading charts…</span>
        </div>
      ) : null}
    </div>
  );
};

export default AdStats;
