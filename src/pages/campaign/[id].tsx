import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";

import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { Button } from "@/components/ui/button";
import { CampaignDetailHero, CampaignDetailSections } from "@/components/campaign";
import type { CampaignDetail } from "@/components/campaign/types";

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const url = id ? endpoints.entities.campaigns.getById(id) : "";
  const { data, isLoading, error } = useApiQuery(url, {
    key: ["campaign-detail", id, url],
    enabled: !!id && !!url,
  } as any);

  const raw = (data as any)?.data?.data ?? (data as any)?.data;
  const campaign: CampaignDetail | null = raw ?? null;

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-muted-foreground">Missing campaign ID.</p>
      </div>
    );
  }

  if (error || (!isLoading && !campaign)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-destructive">Failed to load campaign.</p>
        <Button variant="outline" onClick={() => navigate("/campaign")}>
          Back to list
        </Button>
      </div>
    );
  }

  if (isLoading || !campaign) {
    return (
      <div className="min-h-screen p-6 md:p-8 lg:p-10 max-w-5xl mx-auto">
        <div className="h-10 w-48 rounded-xl bg-muted/30 animate-pulse mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 rounded-2xl bg-muted/20 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="min-h-screen p-4 sm:p-6 md:p-8 lg:p-10 w-full max-w-5xl mx-auto relative before:absolute before:inset-0 before:bg-gradient-to-br before:from-background before:via-background before:to-primary/10 before:-z-10"
    >
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/campaign")}
            className="shrink-0 rounded-xl border-2 hover:bg-muted/60"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
              Campaign details
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
              {campaign.name || "Untitled"}
            </p>
          </div>
        </div>
      </header>

      <CampaignDetailHero campaign={campaign} />
      <CampaignDetailSections campaign={campaign} />
    </motion.div>
  );
}
