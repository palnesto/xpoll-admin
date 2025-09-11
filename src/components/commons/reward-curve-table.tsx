import { useMemo } from "react";
import { buildRewardTable } from "@/utils/civic-logic";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type RewardType = "min" | "max";

export interface RewardCurveTableProps {
  perUserReward: number; // amount / person
  rewardType: RewardType; // "min" | "max"
  totalLevels: number; // global levels cap
  rewardAmountCap: number; // NEW: hard cap per row; show indicator if applied
  label?: string; // optional title like "OCTA" etc.
}

export default function RewardCurveTable({
  perUserReward,
  rewardType,
  totalLevels,
  rewardAmountCap,
  label,
}: RewardCurveTableProps) {
  const parsedAmount = Number(perUserReward);
  const parsedTotal = Math.max(1, Math.floor(totalLevels || 1));
  const cap = Math.max(0, Math.floor(Number(rewardAmountCap) || 0));

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
    <Accordion type="single" collapsible>
      {/* default closed => no defaultValue */}
      <AccordionItem value="reward-preview">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {label ? `${label} ` : ""}Distribution Preview
            </span>
            {cap > 0 && cappedCount > 0 ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">
                capped {cappedCount}
              </span>
            ) : null}
          </div>
        </AccordionTrigger>

        <AccordionContent>
          <div className="mb-2 text-xs text-muted-foreground">
            type: <b>{rewardType}</b> · per-user: <b>{parsedAmount}</b> ·
            levels: <b>{parsedTotal}</b>
            {cap > 0 ? (
              <>
                {" "}
                · cap: <b>{cap}</b>
              </>
            ) : null}
          </div>

          <div className="max-h-48 overflow-auto rounded border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr>
                  <th className="text-left py-1 px-2 w-20">Level</th>
                  <th className="text-left py-1 px-2">Reward</th>
                </tr>
              </thead>
              <tbody>
                <TooltipProvider delayDuration={200}>
                  {rows.map((r) => {
                    const raw = r.reward;
                    const display = cap > 0 ? Math.min(raw, cap) : raw;
                    const isCapped = cap > 0 && raw > cap;
                    const diff = isCapped ? raw - cap : 0;

                    return (
                      <tr key={r.level} className="border-t">
                        <td className="py-1 px-2">{r.level}</td>
                        <td className="py-1 px-2">
                          <div className="flex items-center gap-2">
                            <span>{display}</span>
                            {isCapped ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-[10px] leading-none px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 cursor-help">
                                    −{diff}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs">
                                    Computed <b>{raw}</b> &gt; cap <b>{cap}</b>.
                                    Cap applied.
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </TooltipProvider>
              </tbody>
            </table>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
