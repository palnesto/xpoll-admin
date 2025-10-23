import { useMemo } from "react";
import { buildRewardTable } from "@/utils/civic-logic";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AssetType } from "@/utils/asset";
import { assetSpecs } from "@/utils/currency-assets/asset";
import { RewardsAccordion } from "../reward-table/rewards-accordion";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { amount } from "@/utils/currency-assets/base";

type RewardType = "min" | "max";

export interface RewardCurveTableProps {
  perUserReward: number; // amount / person
  rewardType: RewardType; // "min" | "max"
  totalLevels: number; // global levels cap
  rewardAmountCap: number; // NEW: hard cap per row; show indicator if applied
  label?: string; // optional title like "OCTA" etc.
  asset: AssetType;
}

export default function RewardCurveTable({
  perUserReward,
  rewardType,
  totalLevels,
  rewardAmountCap,
  label,
  asset,
}: RewardCurveTableProps) {
  const { data } = useApiQuery(endpoints.adminMe);
  const highestLevel = data?.data?.data?.highestLevel;
  const parsedAmount = Number(perUserReward);
  const parsedTotal = Math.max(1, Math.floor(totalLevels || 1));
  console.log("rewardAmountCap", rewardAmountCap);
  const cap = Math.max(0, rewardAmountCap);

  const rows = useMemo(() => {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return [];
    return buildRewardTable({
      perUserReward: parsedAmount,
      totalLevels: parsedTotal,
      rewardType,
    });
  }, [parsedAmount, parsedTotal, rewardType]);

  // Nothing valid yet → hint
  if (!rows.length) {
    return (
      <Accordion type="single" collapsible>
        <AccordionItem value="reward-preview">
          <AccordionTrigger>
            {label ? `${label} ` : ""}Distribution Preview
          </AccordionTrigger>
          <AccordionContent>
            <div className="rounded-md border p-3 mt-2 text-xs text-muted-foreground">
              Fill in a positive <b>Amount / person</b> to preview distribution.
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  // Pre-calc how many cells will be capped (for header badge)
  const cappedCount = cap > 0 ? rows.filter((r) => r.reward > cap).length : 0;

  return (
    <RewardsAccordion
      highestLevel={highestLevel ?? 1}
      rewardType={rewardType}
      perUserReward={
        amount({
          op: "toBase",
          assetId: asset,
          value: perUserReward.toString(),
          output: "string",
        })?.value || 0
      }
      // asset="xDrop" // or whichever AssetType
      asset={asset as AssetType}
      size="sm"
    />
  );
}
