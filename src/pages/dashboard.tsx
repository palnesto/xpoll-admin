import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import aptos from "@/assets/aptos.png";
import xrp from "@/assets/xrp.png";
import sui from "@/assets/sui.png";
import xpoll from "@/assets/xpoll.png";
import toast from "react-hot-toast";
import { memo } from "react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";
import { cn } from "@/lib/utils";
import { ASSETS, assetSpecs, AssetType } from "@/utils/currency-assets/asset";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import SystemReportSkeleton from "@/utils/SystemReportSkeleton";

export const Dashboard = memo(function Dashboard() {
  const { data: stats, isLoading } = useApiQuery(
    endpoints.entities.polls.overallPollStats
  );
  const filteredStats = stats?.data?.data;
  console.log("filteredStats", filteredStats);
  const userStats = [
    {
      label: "Total Users",
      // value: filteredStats?.users?.total ?? 0,
      value: 2114,
    },
    ...//filteredStats?.users?.byCountry ||
    ([
      {
        count: 1017,
        country: "IN",
      },
      {
        count: 754,
        country: "US",
      },
      {
        count: 343,
        country: "KR",
      },
      {
        count: 4,
        country: "UNKNOWN",
      },
    ]
      ?.filter((item) => {
        const allowed = ["IN", "US", "KR"];
        return allowed.includes(item.country);
      })
      .map((c) => ({
        label: c.country,
        value: c.count,
      })) ?? []),
  ];

  const pollStats = [
    {
      label: "Total Polls",
      value: filteredStats?.content?.polls ?? 0,
      filter: true,
    },
    {
      label: "Number of Currencies",
      value: filteredStats?.assets?.totalCurrencies ?? 0,
    },
    { label: "Trials", value: filteredStats?.content?.trials ?? 0 },
  ];

  const iconMap: Record<AssetType, string> = {
    [ASSETS.X_DROP]: xrp,
    [ASSETS.X_MYST]: sui,
    [ASSETS.X_OCTA]: aptos,
    [ASSETS.X_POLL]: xpoll,
  };

  // Optional color per asset (tweak freely)
  const colorMap: Record<AssetType, string> = {
    [ASSETS.X_POLL]: "bg-indigo-300",
    [ASSETS.X_OCTA]: "bg-[#6C31EA]",
    [ASSETS.X_MYST]: "bg-[#31CAEA]",
    [ASSETS.X_DROP]: "bg-[#EA3131]",
  };

  const cryptoStats =
    (
      filteredStats?.assets?.balances?.byAsset as
        | Array<{
            assetId: string;
            totalAmount: string | number | bigint;
          }>
        | undefined
    )?.map((a) => {
      const assetId = (a.assetId as AssetType) || ASSETS.X_POLL;
      const meta = assetSpecs[assetId];

      // Convert base → parent display string, with grouping and trimmed decimals
      const valueStr = unwrapString(
        amount({
          op: "toParent",
          assetId,
          value: a.totalAmount,
          output: "string",
          trim: true,
          group: true,
        }),
        "0"
      );
      return {
        name: `Total ${meta?.parentSymbol ?? assetId}`,
        value: `${valueStr} `,
        color: colorMap[assetId] ?? "bg-rose-300",
        img: iconMap[assetId] ?? xpoll,
      };
    }) ?? [];

  const exchangeRequest = {
    count: `${filteredStats?.sellIntents?.pendingCount ?? 0} New Request`,
  };

  const handleViewMore = () => {
    toast("Feature coming soon!");
  };

  if (isLoading) return <SystemReportSkeleton />;
  return (
    <section className="p-4 space-y-4 @container/main flex flex-1 flex-col">
      <h1 className="text-2xl font-semibold">XP Intelligence</h1>
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {userStats.map((data) => (
          <SectionCards data={data} />
        ))}
      </div>
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {pollStats.map((data) => (
          <SectionCards data={data} />
        ))}
      </div>
      <div className="flex justify-around items-center gap-6 py-6 overflow-x-auto">
        {cryptoStats.map((stat, index) => (
          <CryptoStatCircle key={`asset-${index}`} {...stat} />
        ))}
      </div>
      {/* <Card className="p-6 mb-8 bg-primary/5 rounded-3xl">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-semibold text-lg">Exchange Request</h4>
            <p className="text-green-500 font-bold text-xl">
              {exchangeRequest.count}
            </p>
          </div>
          <Button onClick={handleViewMore} variant="default">
            View now
          </Button>
        </div>
      </Card> */}
    </section>
  );
});

export function SectionCards({ data }) {
  const { label, value, filter } = data;
  const cardClass = filter ? "flex-1 md:col-span-2" : "";
  return (
    <Card
      className={`@container/card bg-primary/5 rounded-3xl flex flex-row items-start justify-between ${cardClass}`}
    >
      <CardHeader>
        <CardDescription className="text-muted-foreground text-lg w-64">
          {label}
        </CardDescription>
        <CardTitle className="text-xl font-semibold @[250px]/card:text-3xl">
          {value}
        </CardTitle>
      </CardHeader>
      <CardFooter className="w-48">
        {filter && (
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>All</SelectContent>
          </Select>
        )}
      </CardFooter>
    </Card>
  );
}

export const CryptoStatCircle = ({ name, value, color, img }) => {
  console.log({ name, value, color, img });
  return (
    <section className="flex flex-col items-center text-center">
      <article
        className={`w-32 h-32 rounded-full flex items-center justify-center ${color} mb-4 shadow-inner`}
      >
        <picture className="w-24 h-24 bg-white rounded-full">
          <img
            className={cn({
              "-translate-y-5": "Total XSUI" === name,
            })}
            src={img}
            alt="test"
          />
        </picture>
      </article>
      <p className="font-semibold">{name}</p>
      <p className="text-2xl font-bold">{value}</p>
    </section>
  );
};
