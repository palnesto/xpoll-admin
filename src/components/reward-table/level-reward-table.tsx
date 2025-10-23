// src/components/rewards-table.tsx
import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { type AssetType, assetSpecs } from "@/utils/currency-assets/asset";
import { cn } from "@/lib/utils";
import { buildRewardTable, RewardType } from "@/utils/civic-logic2";
import { LEVELS } from "@/utils/levelConfig";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export type RewardsTableProps = {
  highestLevel: number;
  rewardType: RewardType;
  perUserReward: string | number | bigint; // base currency amount (no decimals!)
  rewardCap: string | number | bigint; // base currency amount (no decimals!)
  asset: AssetType;
  maxDecimals?: number; // limit decimals displayed
  size?: "sm" | "md" | "lg"; // table size variant
  className?: string; // custom class for outer container
};
type CapResult = {
  isCapped: true;
  computed: string;
  cappedAt: string;
} | null;

export function computeCap({
  rewardCap,
  rewardBig,
  asset,
}: {
  rewardCap: string | number | bigint;
  rewardBig: bigint;
  asset: AssetType;
}): CapResult {
  // normalize rewardCap to bigint
  const rewardCapBig =
    typeof rewardCap === "bigint"
      ? rewardCap
      : typeof rewardCap === "string"
      ? BigInt(rewardCap)
      : BigInt(rewardCap);

  if (rewardCapBig < rewardBig) {
    return {
      isCapped: true,
      computed:
        amount({
          op: "toParent",
          assetId: asset,
          value: rewardBig.toString(),
          output: "string",
          trim: true,
          group: true,
        })?.value || "0",
      cappedAt:
        amount({
          op: "toParent",
          assetId: asset,
          value: rewardCapBig.toString(),
          output: "string",
          trim: true,
          group: true,
        })?.value || "0",
    };
  }

  return null;
}

export function RewardsTable({
  highestLevel = 1,
  rewardType,
  perUserReward,
  rewardCap,
  asset,
  maxDecimals,
  size = "md",
  className,
}: RewardsTableProps) {
  highestLevel = 10;
  const decimal = assetSpecs?.[asset]?.decimal;
  const parentSymbol = assetSpecs?.[asset]?.parentSymbol;
  const img = assetSpecs?.[asset]?.img;
  const decimalsToShow = Math.min(
    decimal,
    maxDecimals != null ? maxDecimals : decimal
  );

  // Normalize to bigint (source of truth)
  const rewardBig = useMemo(() => {
    if (typeof perUserReward === "bigint") return perUserReward;
    if (typeof perUserReward === "string") return BigInt(perUserReward);
    return BigInt(perUserReward);
  }, [perUserReward]);

  // Build rewards table (civic-logic2 expects number)
  const rewards = useMemo(() => {
    return buildRewardTable({
      totalLevels: highestLevel,
      rewardType,
      perUserReward: rewardBig,
    });
  }, [highestLevel, rewardType, rewardBig]);

  // Size styles
  const sizeStyles = {
    sm: {
      td: "p-2 text-xs",
      icon: "h-4 w-4",
      font: "text-xs",
    },
    md: {
      td: "p-3 text-sm",
      icon: "h-5 w-5",
      font: "text-sm",
    },
    lg: {
      td: "p-4 text-base",
      icon: "h-6 w-6",
      font: "text-base",
    },
  }[size];

  // Merge LEVELS config with rewards
  const rows = Array.from({ length: highestLevel }, (_, idx) => {
    const levelNum = idx + 1;
    const rewardBase = rewards.find((r) => r.level === levelNum)?.reward ?? 0n;
    console.log("rewardBase", rewardBase);
    const cap = computeCap({ rewardCap, rewardBig: rewardBase, asset });
    console.log("cap", cap);

    // convert base → parent with clamped decimals
    const rewardParent = unwrapString(
      amount({
        op: "toParent",
        assetId: asset,
        value: rewardBase.toString(),
        output: "string",
        fixed: decimalsToShow,
        group: false,
      }),
      "0"
    );

    const config = LEVELS.find((l) => l.id === levelNum);

    return {
      id: levelNum,
      title: config?.title ?? "—",
      image: config?.image ?? "",
      reward: rewardParent,
      cap,
    };
  });

  return (
    <Card className={cn("overflow-hidden", className)}>
      <table className="w-full border-collapse">
        <tbody>
          {rows.map((level) => (
            <tr
              key={level.id}
              className="border-b last:border-b-0 hover:bg-muted/50 transition"
            >
              {/* 1st col: level image */}
              <td className={cn(sizeStyles.td, "w-12")}>
                {level.image ? (
                  <img
                    src={level.image}
                    alt={level.title}
                    className={cn("object-contain", sizeStyles.icon)}
                  />
                ) : (
                  <div
                    className={cn("rounded-full bg-muted", sizeStyles.icon)}
                  />
                )}
              </td>

              {/* 2nd col: Level number */}
              <td className={cn(sizeStyles.td, "text-muted-foreground")}>
                Level {level.id}
              </td>

              {/* 3rd col: Title */}
              <td className={cn(sizeStyles.td, "font-semibold")}>
                {level.title}
              </td>

              {/* 4th col: Reward (right aligned with coin img) */}
              <td
                className={cn(
                  sizeStyles.td,
                  "font-mono tabular-nums text-right"
                )}
              >
                <div className="flex items-center justify-end gap-1">
                  <img
                    src={img}
                    alt={parentSymbol}
                    className={cn("object-contain", sizeStyles.icon)}
                  />
                  <span>
                    {level?.cap ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-yellow-600 font-mono">
                            {level?.cap.cappedAt}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <div className="text-sm leading-snug text-yellow-700">
                            <div>
                              <span className="font-semibold">Computed:</span>{" "}
                              {level?.cap.computed}
                            </div>
                            <div>
                              <span className="font-semibold">Capped at:</span>{" "}
                              {level?.cap.cappedAt}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span>{level.reward}</span>
                    )}{" "}
                    {parentSymbol}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
