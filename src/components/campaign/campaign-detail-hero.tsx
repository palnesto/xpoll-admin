import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CampaignStatus, CampaignDetail } from "@/components/campaign/types";

export function StatusPill({ status }: { status: CampaignStatus }) {
  const styles: Record<string, string> = {
    draft: "bg-slate-500/25 text-slate-200 border-slate-400/50",
    scheduled: "bg-blue-500/25 text-blue-200 border-blue-400/50",
    live: "bg-emerald-500/25 text-emerald-200 border-emerald-400/50",
    ended: "bg-amber-500/25 text-amber-200 border-amber-400/50",
    archived: "bg-red-500/25 text-red-200 border-red-400/50",
  };
  const s =
    styles[String(status)] ??
    "bg-muted/50 text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-flex px-3 py-1 rounded-full text-sm font-medium border",
        s
      )}
    >
      {status || "—"}
    </span>
  );
}

export function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-2 border-b border-border/50 last:border-0">
      <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground shrink-0">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </span>
      <span className="text-sm text-foreground break-words">{value ?? "—"}</span>
    </div>
  );
}

export function SectionCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Card
        className={cn(
          "rounded-2xl border-2 bg-gradient-to-br from-card/95 to-card/80 overflow-hidden",
          className
        )}
      >
        <CardHeader className="pb-3 border-b border-border/50 bg-gradient-to-r from-muted/30 to-transparent">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">{children}</CardContent>
      </Card>
    </motion.div>
  );
}

export type CampaignDetailHeroProps = {
  campaign: CampaignDetail;
};

export function CampaignDetailHero({ campaign }: CampaignDetailHeroProps) {
  const author = campaign.externalAuthor;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6 sm:mb-8"
    >
      <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-card via-card/95 to-primary/10 p-5 sm:p-6 shadow-xl shadow-primary/10">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {campaign.name || "Untitled campaign"}
              </h2>
              <StatusPill status={campaign.status} />
              {campaign.isPolitical && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/20 text-rose-200 border border-rose-400/40">
                  Political
                </span>
              )}
            </div>
            {campaign.goal && (
              <p className="text-muted-foreground text-sm sm:text-base mt-2 line-clamp-3">
                {campaign.goal}
              </p>
            )}
          </div>

          {author && (
            <Card className="shrink-0 w-full lg:w-72 rounded-xl border-2 bg-gradient-to-r from-muted/40 to-muted/20 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {author.avatar?.imageUrl ? (
                    <img
                      src={author.avatar.imageUrl}
                      alt={author.avatar.name ?? author.username ?? "Author"}
                      className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-semibold text-primary">
                      {author.username?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {author.username ?? author.avatar?.name ?? "Author"}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {author._id}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </motion.section>
  );
}
