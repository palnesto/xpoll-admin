import { User, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalAccountSelect } from "@/components/commons/selects/external-accounts";
import type { ListingOption } from "@/components/commons/selects/external-accounts";
import { assets as rewardAssetOptions, assetSpecs } from "@/utils/currency-assets/asset";
import type { CampaignStatus } from "@/components/campaign/types";
import type { CampaignListingState } from "@/components/campaign/use-campaign-listing";

export type CampaignListFiltersProps = {
  state: CampaignListingState;
  total: number;
  onResetFilters: () => void;
};

const STATUS_OPTIONS: { value: CampaignStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "live", label: "Live" },
  { value: "ended", label: "Ended" },
  { value: "archived", label: "Archived" },
];

export function CampaignListFilters({
  state,
  total,
  onResetFilters,
}: CampaignListFiltersProps) {
  const {
    externalAuthorId,
    setExternalAuthorId,
    setExternalAuthorLabel,
    setName,
    name,
    setStatus,
    status,
    rewardAsset,
    setRewardAsset,
    setPage,
  } = state;

  return (
    <section className="mb-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-background/60 via-background/80 to-primary/5 p-4 sm:p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary shadow-sm shadow-primary/30">
            <Filter className="h-4 w-4" />
          </span>
          <span>Filters</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-full px-3 py-1.5 h-8 text-xs"
          onClick={onResetFilters}
        >
          Reset filters
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="flex flex-col gap-2 min-w-0">
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground shrink-0">
            <User className="h-3.5 w-3.5 shrink-0" />
            Author (user)
          </label>
          <div className="min-h-[44px] w-full min-w-0 [&_.my-dropdown__single-value]:!text-white [&_.my-dropdown__value-container]:!text-white [&_.my-dropdown__control]:!min-h-[44px] [&_.my-dropdown__control]:!rounded-lg [&_.my-dropdown__control]:!border [&_.my-dropdown__control]:!border-border [&_.my-dropdown__control]:!bg-black [&_.my-dropdown__input]:!text-white">
            <ExternalAccountSelect
              theme="dark"
              onChange={(opt: ListingOption<unknown> | null) => {
                const id = opt?.value ?? null;
                setExternalAuthorId(id);
                setExternalAuthorLabel(opt?.label ?? "");
                setPage(1);
              }}
              placeholder="Filter by user…"
              selectProps={{
                menuPortalTarget: document.body,
                menuPosition: "fixed",
                value: externalAuthorId
                  ? {
                      value: externalAuthorId,
                      label: state.externalAuthorLabel || externalAuthorId,
                    }
                  : null,
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 min-w-0">
          <label className="text-xs font-medium text-muted-foreground shrink-0">
            Name / Goal
          </label>
          <Input
            className="h-11 w-full min-w-0 rounded-lg border border-border bg-black text-white placeholder:text-gray-400 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Search by name or goal…"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setPage(1);
            }}
            autoComplete="off"
          />
        </div>

        <div className="flex flex-col gap-2 min-w-0">
          <label className="text-xs font-medium text-muted-foreground shrink-0">
            Status
          </label>
          <select
            className="h-11 w-full min-w-0 rounded-lg border border-border bg-black text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 [&_option]:bg-black [&_option]:text-white [&_option:checked]:bg-gray-600 [&_option:checked]:text-white"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as CampaignStatus | "");
              setPage(1);
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2 min-w-0">
          <label className="text-xs font-medium text-muted-foreground shrink-0">
            Reward Assets
          </label>
          <select
            className="h-11 w-full min-w-0 rounded-lg border border-border bg-black text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 [&_option]:bg-black [&_option]:text-white [&_option:checked]:bg-gray-600 [&_option:checked]:text-white"
            value={rewardAsset}
            onChange={(e) => {
              setRewardAsset(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All assets</option>
            {rewardAssetOptions.map((code) => {
              const meta = assetSpecs[code as keyof typeof assetSpecs];
              const label = meta
                ? `${meta.symbol} • ${meta.name}`
                : String(code);
              return (
                <option key={code} value={code}>
                  {label}
                </option>
              );
            })}
          </select>
          <p className="text-[10px] text-muted-foreground/80 mt-0.5">
            Sent as <span className="font-mono">rewardAssets</span> query param.
          </p>
        </div>
      </div>

      {total === 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">
          No campaigns found for current filters
        </p>
      ) : null}
    </section>
  );
}
