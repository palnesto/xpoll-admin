import * as React from "react";

/**
 * ---- Types mirroring your backend schema ----
 */
type ConfidenceLevel = "Low" | "Medium" | "High";
type BlockType = "text" | "table" | "chart" | "tags" | "stat-cards" | "custom";

export interface QueryUIResponse {
  meta: {
    query: string;
    generatedAt: string;
    confidence: { score: number; level: ConfidenceLevel };
    coverage: { pollsConsidered: number; totalVotes: number };
    tags?: string[];
  };
  layout: UIBlock[];
}

type UIBlock =
  | TextBlock
  | TableBlock
  | ChartBlock
  | TagList
  | StatCardBlock
  | CustomBlock;

interface TextBlock {
  type: "text";
  variant: "heading" | "subheading" | "body" | "note" | "quote";
  content: string;
}

interface TableBlock {
  type: "table";
  title?: string;
  columns: string[];
  rows: (string | number | null)[][];
}

interface ChartBlock {
  type: "chart";
  chartType:
    | "bar"
    | "horizontal-bar"
    | "stacked-bar"
    | "pie"
    | "doughnut"
    | "line"
    | "scatter"
    | "radar";
  title?: string;
  xAxis?: string;
  yAxis?: string;
  legend?: boolean;
  data: ChartDataItem[];
}

interface ChartDataItem {
  label: string;
  value: number;
  color?: string;
  group?: string;
}

interface TagList {
  type: "tags";
  title?: string;
  tags: { label: string; color?: string; icon?: string }[];
}

interface StatCardBlock {
  type: "stat-cards";
  cards: {
    label: string;
    value: string | number;
    unit?: string;
    change?: number;
    trend?: "up" | "down" | "neutral";
  }[];
}

interface CustomBlock {
  type: "custom";
  component: string;
  props: Record<string, any>;
}

/**
 * ---- shadcn/ui imports ----
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

/**
 * ---- Chart.js setup ----
 */
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Pie, Doughnut, Line, Bar, Radar, Scatter } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Tooltip,
  Legend
);

/**
 * ---- Utility helpers ----
 */
const cls = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");

function trendToColor(t?: "up" | "down" | "neutral") {
  switch (t) {
    case "up":
      return "text-emerald-600";
    case "down":
      return "text-rose-600";
    default:
      return "text-muted-foreground";
  }
}

function toChartDataset(
  items: ChartDataItem[],
  defaultLabel = "Series"
): { labels: string[]; datasets: any[] } {
  const labels = items.map((d) => d.label);
  const data = items.map((d) => d.value);
  const backgroundColor = items.map(
    (d, i) => d.color ?? `hsl(${(i * 47) % 360}, 70%, 55%)`
  );
  return {
    labels,
    datasets: [
      {
        label: defaultLabel,
        data,
        backgroundColor,
        borderWidth: 1,
        borderColor: "#fff",
      },
    ],
  };
}

function toGroupedBar(items: ChartDataItem[]) {
  const groups = Array.from(new Set(items.map((d) => d.group || "Series")));
  const labels = Array.from(new Set(items.map((d) => d.label)));
  const datasets = groups.map((g, gi) => {
    const data = labels.map((lab) => {
      const match = items.find(
        (d) => d.label === lab && (d.group || "Series") === g
      );
      return match?.value ?? 0;
    });
    const bg =
      items.find((d) => (d.group || "Series") === g)?.color ??
      `hsl(${(gi * 67) % 360}, 70%, 55%)`;
    return {
      label: g,
      data,
      backgroundColor: bg,
    };
  });
  return { labels, datasets };
}

function toStackedBar(items: ChartDataItem[]) {
  const out = toGroupedBar(items);
  out.datasets = out.datasets.map((ds) => ({ ...ds, stack: "stack-0" }));
  return out;
}

/**
 * ---- Block subcomponents ----
 */
const TextRenderer: React.FC<{ block: TextBlock }> = ({ block }) => {
  switch (block.variant) {
    case "heading":
      return (
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {block.content}
        </h2>
      );
    case "subheading":
      return (
        <h3 className="text-lg font-semibold text-primary">{block.content}</h3>
      );
    case "quote":
      return (
        <blockquote className="border-l-4 pl-3 italic text-muted-foreground bg-muted/30 rounded-md py-2">
          {block.content}
        </blockquote>
      );
    case "note":
      return (
        <div className="text-sm text-muted-foreground bg-muted/20 p-2 rounded-md">
          {block.content}
        </div>
      );
    default:
      return <p className="text-base leading-relaxed">{block.content}</p>;
  }
};

const TagListRenderer: React.FC<{ block: TagList }> = ({ block }) => {
  return (
    <div className="flex flex-col gap-2">
      {block.title ? (
        <h4 className="text-sm font-semibold text-foreground/80">
          {block.title}
        </h4>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {block.tags.map((t, i) => (
          <Badge
            key={i}
            variant="secondary"
            className={cls(
              "capitalize px-3 py-1 text-sm shadow-sm",
              t.color ? `bg-[${t.color}] text-white` : ""
            )}
          >
            {t.label}
          </Badge>
        ))}
      </div>
    </div>
  );
};

const StatCardsRenderer: React.FC<{ block: StatCardBlock }> = ({ block }) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {block.cards.map((c, i) => (
        <Card
          key={i}
          className="h-full border border-border/50 shadow-md hover:shadow-lg transition-shadow"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {c.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-foreground">
              {c.value}
              {c.unit ? (
                <span className="text-base text-muted-foreground ml-1">
                  {c.unit}
                </span>
              ) : null}
            </div>
            {typeof c.change === "number" ? (
              <div
                className={cls(
                  "text-xs mt-1 font-medium",
                  trendToColor(c.trend)
                )}
              >
                {c.change > 0 ? "+" : ""}
                {c.change}%
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const TableRenderer: React.FC<{ block: TableBlock }> = ({ block }) => {
  return (
    <Card className="border border-border/50 shadow-sm">
      {block.title ? (
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">
            {block.title}
          </CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className="pt-0">
        <div className="w-full overflow-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                {block.columns.map((c, i) => (
                  <TableHead key={i} className="whitespace-nowrap font-medium">
                    {c}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {block.rows.map((r, i) => (
                <TableRow
                  key={i}
                  className="hover:bg-muted/20 transition-colors"
                >
                  {r.map((cell, ci) => (
                    <TableCell key={ci} className="whitespace-pre-wrap">
                      {cell === null ? "" : String(cell)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

const ChartRenderer: React.FC<{ block: ChartBlock }> = ({ block }) => {
  const { chartType, data, title, legend } = block;
  const gridCard = "p-0";

  let content: React.ReactNode = null;
  const commonOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: legend ?? true, labels: { boxWidth: 16 } },
    },
    scales: {},
  };

  switch (chartType) {
    case "pie":
    case "doughnut": {
      const ds = toChartDataset(data);
      const Comp = chartType === "pie" ? Pie : Doughnut;
      content = (
        <div className="h-72">
          <Comp data={ds} options={commonOptions} />
        </div>
      );
      break;
    }

    case "bar":
    case "horizontal-bar":
    case "stacked-bar": {
      const stacked = chartType === "stacked-bar";
      const horizontal = chartType === "horizontal-bar";

      const ds = stacked ? toStackedBar(data) : toGroupedBar(data);

      const options = {
        ...commonOptions,
        indexAxis: horizontal ? "y" : "x",
        scales: {
          x: { stacked, ticks: { autoSkip: true, maxRotation: 0 } },
          y: { stacked, beginAtZero: true },
        },
      };

      content = (
        <div className="h-80">
          <Bar data={ds} options={options} />
        </div>
      );
      break;
    }

    case "line": {
      const ds = toChartDataset(data);
      const options = {
        ...commonOptions,
        tension: 0.3,
        elements: { point: { radius: 4 } },
        scales: {
          x: { ticks: { autoSkip: true, maxRotation: 0 } },
          y: { beginAtZero: true },
        },
      };
      content = (
        <div className="h-72">
          <Line data={ds} options={options} />
        </div>
      );
      break;
    }

    case "radar": {
      const ds = toChartDataset(data);
      content = (
        <div className="h-72">
          <Radar data={ds} options={commonOptions} />
        </div>
      );
      break;
    }

    case "scatter": {
      const labels = data.map((d) => d.label);
      const points = data.map((d) => ({ x: d.label, y: d.value }));
      const ds = {
        labels,
        datasets: [
          {
            label: "Series",
            data: points,
            backgroundColor: "hsl(220, 75%, 55%)",
          },
        ],
      };
      const options = {
        ...commonOptions,
        parsing: false,
        scales: {
          x: { type: "category" as const },
          y: { beginAtZero: true },
        },
      };
      content = (
        <div className="h-72">
          <Scatter data={ds} options={options} />
        </div>
      );
      break;
    }
  }

  return (
    <Card className="border border-border/50 shadow-sm">
      {title ? (
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent className={gridCard}>{content}</CardContent>
    </Card>
  );
};

/**
 * ---- Main renderer ----
 */
export const UILayoutRenderer: React.FC<{
  data: QueryUIResponse;
  className?: string;
  customRenderers?: Record<string, React.FC<any>>;
}> = ({ data, className, customRenderers = {} }) => {
  const { meta, layout } = data;

  return (
    <div className={cls("flex flex-col gap-6", className)}>
      {/* Header meta */}
      <div className="flex flex-col gap-3 rounded-lg border border-border/50 bg-muted/30 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-lg font-bold text-foreground">{meta.query}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(meta.generatedAt).toLocaleString()}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
            Confidence: {meta.confidence.level} ({meta.confidence.score}/100)
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            Coverage: {meta.coverage.pollsConsidered} polls /{" "}
            {meta.coverage.totalVotes} votes
          </Badge>
          {meta.tags?.slice(0, 4).map((t, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="bg-purple-50 text-purple-700 hidden sm:inline-flex"
            >
              {t}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      {/* Blocks */}
      <div className="grid grid-cols-1 gap-6">
        {layout.map((block, idx) => {
          switch (block.type as BlockType) {
            case "text":
              return <TextRenderer key={idx} block={block as TextBlock} />;

            case "tags":
              return <TagListRenderer key={idx} block={block as TagList} />;

            case "stat-cards":
              return (
                <StatCardsRenderer key={idx} block={block as StatCardBlock} />
              );

            case "table":
              return <TableRenderer key={idx} block={block as TableBlock} />;

            case "chart":
              return <ChartRenderer key={idx} block={block as ChartBlock} />;

            case "custom": {
              const b = block as CustomBlock;
              const Comp = customRenderers[b.component];
              if (!Comp) {
                return (
                  <Card
                    key={idx}
                    className="border border-dashed border-border/50"
                  >
                    <CardHeader>
                      <CardTitle className="text-base font-medium text-rose-600">
                        Missing custom renderer: {b.component}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs whitespace-pre-wrap">
                        {JSON.stringify(b.props, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                );
              }
              return <Comp key={idx} {...b.props} />;
            }

            default:
              return null;
          }
        })}
      </div>
    </div>
  );
};
