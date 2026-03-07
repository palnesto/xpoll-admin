import { Badge } from "@/components/ui/badge";
import type { Limits } from "../types";

type BuyConfigPageHeaderProps = {
  limits: Limits;
};

export function BuyConfigPageHeader({ limits }: BuyConfigPageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold">Buy Config Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage purchasable buy configs only. USD and USDC rates are capped at{" "}
          {limits.maxUsdMajor}.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline">USD Max: {limits.maxUsdMajor}</Badge>
        <Badge variant="outline">USDC Max: {limits.maxUsdcMajor}</Badge>
      </div>
    </div>
  );
}
