import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { truncateText } from "@/utils/formatter";
import type { CampaignListItem, CampaignStatus } from "@/components/campaign/types";
import { formatCampaignDate } from "@/components/campaign/types";

const STATUS_BADGE_STYLES: Record<string, string> = {
  draft: "bg-slate-500/20 text-slate-200 border-slate-500/40",
  scheduled: "bg-blue-500/15 text-blue-200 border-blue-500/40",
  live: "bg-emerald-500/15 text-emerald-200 border-emerald-500/40",
  ended: "bg-amber-500/15 text-amber-200 border-amber-500/40",
  archived: "bg-red-500/15 text-red-200 border-red-500/40",
};

function StatusBadge({ status }: { status: CampaignStatus }) {
  const cls =
    STATUS_BADGE_STYLES[String(status)] ??
    "bg-slate-500/20 text-slate-100 border-slate-500/40";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs border",
        cls
      )}
    >
      {status || "unknown"}
    </span>
  );
}
 
export function CampaignCardSkeleton() {
  return (
    <Card className="rounded-2xl border-2 border-border/40 bg-muted/20 overflow-hidden animate-pulse">
      <CardHeader className="relative flex flex-col gap-2 pr-24">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-3 w-32 rounded bg-muted" />
          </div>
        </div>
        <div className="h-3 w-full rounded bg-muted mt-1" />
        <div className="h-3 w-3/4 rounded bg-muted mt-1" />
        <div className="absolute top-1 right-4 flex flex-col items-end gap-1">
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-5 w-14 rounded-full bg-muted" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        <div className="flex flex-col gap-1 text-[11px]">
          <div className="h-3 w-28 rounded bg-muted" />
          <div className="h-3 w-40 rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}

export type CampaignCardProps = {
  item: CampaignListItem;
  onOpen: (id: string) => void;
};

export function CampaignCard({ item, onOpen }: CampaignCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Card
        role="button"
        tabIndex={0}
        onClick={() => onOpen(item._id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onOpen(item._id);
        }}
        className={cn(
          "group rounded-2xl cursor-pointer border-2 bg-gradient-to-br from-card/90 to-card/70",
          "hover:border-primary/60 hover:shadow-xl hover:shadow-primary/20 transition-all duration-300"
        )}
      >
        <CardHeader className="relative flex flex-col gap-2 pr-24">
          <div className="flex flex-col justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/40">
                {item.name?.[0]?.toUpperCase() ?? "C"}
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base font-semibold truncate">
                  {truncateText(item.name, 17)}
                </CardTitle>
                {item.isPolitical ? (
                  <p className="text-[11px] text-rose-300/80 mt-0.5">
                    Political campaign
                  </p>
                ) : (
                  <p className="text-[11px] text-emerald-300/80 mt-0.5">
                    Non-political campaign
                  </p>
                )}
              </div>
            </div>
          </div>

          {item.goal ? (
            <p className="text-xs text-muted-foreground/90 line-clamp-2 mt-1">
              {truncateText(item.goal, 100)}
            </p>
          ) : null}

          <div className="absolute top-1 right-4 flex flex-col items-end justify-between gap-1 text-[11px] text-muted-foreground/80">
            {formatCampaignDate(item.updatedAt || item.createdAt)}
            <StatusBadge status={item.status} />
          </div>
        </CardHeader>

        <CardContent className="pt-0 pb-4">
          <div className="flex flex-col justify-between text-[11px] text-muted-foreground/80">
            <span>Author id: {item.externalAuthor}</span>
            <span className="italic">ID: {item._id}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
