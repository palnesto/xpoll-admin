import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import xpoll from "@/assets/xpoll.png";
import { memo } from "react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";
import { cn } from "@/lib/utils";
import { ASSETS, assetSpecs, AssetType } from "@/utils/currency-assets/asset";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import SpotlightCard from "@/components/SpotlightCard";
import { Slide } from "react-awesome-reveal";
import { Skeleton } from "@/components/ui/skeleton";

export const Dashboard = memo(function Dashboard() {
  const { data: totalSupplyData } = useApiQuery(endpoints.assets.totalSupply);
  console.log("totalSupplyData", totalSupplyData);
  const { data: stats, isLoading } = useApiQuery(
    endpoints.entities.polls.overallPollStats,
  );
  const filteredStats = stats?.data?.data;
  const countryWiseStats = [
    {
      label: "IN",
      value: filteredStats?.users?.byCountry?.find((c) => c.country === "IN")
        ?.count,
    },
    {
      label: "US",
      value:
        filteredStats?.users?.byCountry?.find((c) => c.country === "US")
          ?.count +
        filteredStats?.users?.byCountry?.find((c) => c.country === "UNKNOWN")
          ?.count,
    },
    {
      label: "KR",
      value: filteredStats?.users?.byCountry?.find((c) => c.country === "KR")
        ?.count,
    },
    {
      label: "VN",
      value: filteredStats?.users?.byCountry?.find((c) => c.country === "VN")
        ?.count,
    },
  ];
  const userStats = [
    {
      label: "Total Users",
      value: filteredStats?.users?.total,
    },
    // ...(filteredStats?.users?.byCountry
    //   ?.filter((item: { count: number; country: string }) => {
    //     console.log("reaching", item);
    //     const allowed = ["IN", "US", "KR"];
    //     return allowed.includes(item.country);
    //   })
    //   .map((c: { count: number; country: string }) => ({
    //     label: c.country,
    //     value: c.count,
    //   })) ?? []),
    ...countryWiseStats,
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
    { label: "Trails", value: filteredStats?.content?.trials ?? 0 },
  ];

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
      const meta = assetSpecs[assetId] ?? assetSpecs[ASSETS.X_POLL];

      const valueStr = unwrapString(
        amount({
          op: "toParent",
          assetId,
          value: a.totalAmount,
          output: "string",
          trim: true,
          group: true,
        }),
        "0",
      );
      return {
        name: `Total ${meta?.parent ?? assetId}`,
        value: `${valueStr} `,
        img: meta.img ?? xpoll,
      };
    }) ?? [];

  return (
    <section className="p-4 space-y-4 @container/main flex flex-1 flex-col">
      <h1 className="text-2xl font-semibold">XP Intelligence</h1>
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-5">
        {userStats?.map((data) => (
          <SectionCards data={data} />
        ))}
      </div>
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {pollStats.map((data) => (
          <SectionCards data={data} />
        ))}
      </div>
      <div className="flex justify-around items-center gap-6 py-6 overflow-x-auto">
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div className="flex flex-col items-center space-y-3">
                <Skeleton className="h-[125px] w-[125px] rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[250px]" />
                </div>
              </div>
            ))
          : cryptoStats.map((stat, index) => (
              <Slide
                key={`asset-${index}`}
                direction="up"
                cascade
                triggerOnce
                delay={index * 50}
              >
                <CryptoStatCircle {...stat} />
              </Slide>
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
    <SpotlightCard
      className="custom-spotlight-card"
      spotlightColor="rgba(245, 244, 207, 0.1)"
    >
      <Card
        className={`@container/card border border-zinc-700/50 bg-sidebar rounded-3xl flex flex-row items-start justify-between ${cardClass}`}
      >
        <CardHeader>
          <CardDescription className="text-muted-foreground text-lg w-64 tracking-wide">
            {label}
          </CardDescription>
          <CardTitle className="text-xl font-semibold @[250px]/card:text-3xl tracking-wide">
            {value}
          </CardTitle>
        </CardHeader>
      </Card>
    </SpotlightCard>
  );
}

export const CryptoStatCircle = ({
  name,
  value,
  img,
}: {
  name: string;
  value: string;
  img: string;
}) => {
  return (
    <section className="flex flex-col items-center text-center">
      <article
        className={`w-32 h-32 rounded-full flex items-center justify-center mb-4`}
      >
        <picture className="w-24 h-24  ">
          <img
            className={cn({
              "-translate-y-5 w-28 h-36": "Total xSUI" === name,
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
// import {
//   Card,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import aptos from "@/assets/aptos.png";
// import xrp from "@/assets/xrp.png";
// import sui from "@/assets/sui.png";
// import xpoll from "@/assets/xpoll.png";
// import strain from "@/assets/strain.png";
// import give from "@/assets/give.png";
// import { memo } from "react";
// import { useApiQuery } from "@/hooks/useApiQuery";
// import { endpoints } from "@/api/endpoints";
// import { cn } from "@/lib/utils";
// import { ASSETS, assetSpecs, AssetType } from "@/utils/currency-assets/asset";
// import { amount, unwrapString } from "@/utils/currency-assets/base";
// import SpotlightCard from "@/components/SpotlightCard";
// import { Slide } from "react-awesome-reveal";
// import { Skeleton } from "@/components/ui/skeleton";

// export const Dashboard = memo(function Dashboard() {
//   const userStats = [
//     { label: "Total Users", value: 9050 },
//     { label: "IN", value: 2630 },
//     { label: "US", value: 2500 },
//     { label: "KR", value: 1188 },
//     { label: "VN", value: 662 },
//   ];

//   const pollStats = [
//     { label: "Total Polls", value: 1290, filter: true },
//     { label: "Number of Currencies", value: 5 },
//     { label: "Trails", value: 58 },
//   ];

//   const { data: stats, isLoading } = useApiQuery(
//     endpoints.entities.polls.overallPollStats,
//   );

//   const filteredStats = stats?.data?.data;

//   const iconMap: Record<AssetType, string> = {
//     [ASSETS.X_DROP]: xrp,
//     [ASSETS.X_MYST]: sui,
//     [ASSETS.X_OCTA]: aptos,
//     [ASSETS.X_POLL]: xpoll,
//     [ASSETS.X_HIGH]: strain,
//     [ASSETS.X_GIVE]: give,
//   };

//   const cryptoStats =
//     (
//       filteredStats?.assets?.balances?.byAsset as
//         | Array<{
//             assetId: string;
//             totalAmount: string | number | bigint;
//           }>
//         | undefined
//     )?.map((a) => {
//       const assetId = (a.assetId as AssetType) || ASSETS.X_POLL;
//       const meta = assetSpecs[assetId];

//       const valueStr = unwrapString(
//         amount({
//           op: "toParent",
//           assetId,
//           value: a.totalAmount,
//           output: "string",
//           trim: true,
//           group: true,
//         }),
//         "0",
//       );

//       return {
//         name: `Total ${meta?.parent ?? assetId}`,
//         value: valueStr,
//         img: iconMap[assetId] ?? xpoll,
//       };
//     }) ?? [];

//   // if (isLoading) return <SystemReportSkeleton />;

//   return (
//     <section className="p-4 space-y-4 @container/main flex flex-1 flex-col">
//       <h1 className="text-2xl font-semibold">XP Intelligence</h1>

//       {/* USER STATS */}
//       <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-5">
//         {userStats.map((data) => (
//           <SectionCards key={data.label} data={data} />
//         ))}
//       </div>

//       {/* POLL STATS */}
//       <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
//         {pollStats.map((data) => (
//           <SectionCards key={data.label} data={data} />
//         ))}
//       </div>

//       <div className="flex justify-around items-center gap-6 py-6 overflow-x-auto">
//         {isLoading
//           ? Array.from({ length: 5 }).map((_, i) => (
//               <div className="flex flex-col items-center space-y-3">
//                 <Skeleton className="h-[125px] w-[125px] rounded-full" />
//                 <div className="space-y-2">
//                   <Skeleton className="h-4 w-[200px]" />
//                   <Skeleton className="h-4 w-[250px]" />
//                 </div>
//               </div>
//             ))
//           : cryptoStats.map((stat, index) => (
//               <Slide
//                 key={`asset-${index}`}
//                 direction="up"
//                 cascade
//                 triggerOnce
//                 delay={index * 50}
//               >
//                 <CryptoStatCircle {...stat} />
//               </Slide>
//             ))}
//       </div>
//     </section>
//   );
// });

// export function SectionCards({ data }) {
//   const { label, value, filter } = data;
//   const cardClass = filter ? "flex-1 md:col-span-2" : "";

//   return (
//     <SpotlightCard
//       className="custom-spotlight-card"
//       spotlightColor="rgba(245, 244, 207, 0.1)"
//     >
//       <Card
//         className={`border border-zinc-700/50 bg-sidebar rounded-3xl flex flex-row items-start justify-between ${cardClass}`}
//       >
//         <CardHeader>
//           <CardDescription className="text-muted-foreground text-lg w-64 tracking-wide">
//             {label}
//           </CardDescription>
//           <CardTitle className="text-xl font-semibold @[250px]/card:text-3xl tracking-wide">
//             {value}
//           </CardTitle>
//         </CardHeader>
//       </Card>
//     </SpotlightCard>
//   );
// }

// export const CryptoStatCircle = ({ name, value, img }) => {
//   return (
//     <section className="flex flex-col items-center text-center">
//       <article className="w-32 h-32 rounded-full flex items-center justify-center mb-4">
//         <picture className="w-24 h-24">
//           <img
//             className={cn({
//               "-translate-y-5 w-28 h-36": name === "Total xSUI",
//             })}
//             src={img}
//             alt={name}
//           />
//         </picture>
//       </article>
//       <p className="font-semibold">{name}</p>
//       <p className="text-2xl font-bold">{value}</p>
//     </section>
//   );
// };
