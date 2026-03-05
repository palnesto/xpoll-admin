import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  CampaignCard,
  CampaignCardSkeleton,
  CampaignListFilters,
  useCampaignListing,
  type CampaignListingState,
  type CampaignStatus,
} from "@/components/campaign";

function CampaignsPage() {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [externalAuthorId, setExternalAuthorId] = useState<string | null>(null);
  const [externalAuthorLabel, setExternalAuthorLabel] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<CampaignStatus | "">("");
  const [rewardAsset, setRewardAsset] = useState<string>("");

  const state: CampaignListingState = {
    page,
    setPage,
    externalAuthorId,
    setExternalAuthorId,
    externalAuthorLabel,
    setExternalAuthorLabel,
    name,
    setName,
    status,
    setStatus,
    rewardAsset,
    setRewardAsset,
  };

  const {
    entries,
    total,
    totalPages,
    loading,
    error,
  } = useCampaignListing(state);

  const handleOpen = (id: string) => navigate(`/campaign/${id}`);

  const resetFilters = () => {
    setPage(1);
    setExternalAuthorId(null);
    setExternalAuthorLabel("");
    setName("");
    setStatus("");
    setRewardAsset("");
  };

  const currentPage = Math.min(Math.max(1, page), Math.max(1, totalPages));

  const buildPages = (): (number | "...")[] => {
    const maxPagesToShow = 9;
    const pages: (number | "...")[] = [];

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    const window = 2;
    const start = Math.max(2, currentPage - window);
    const end = Math.min(totalPages - 1, currentPage + window);

    pages.push(1);
    if (start > 2) pages.push("...");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push("...");
    pages.push(totalPages);

    return pages;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="min-h-screen p-6 md:p-8 lg:p-10 w-full max-w-6xl mx-auto relative before:absolute before:inset-0 before:bg-gradient-to-br before:from-background before:via-background before:to-primary/10 before:-z-10"
    >
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0 rounded-xl border-2 hover:bg-muted/60"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
              All Campaigns
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
              Filter by author, name, status, and reward assets
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          className="rounded-xl border-primary/60 bg-gradient-to-r from-primary/90 to-primary/70 text-white hover:from-primary/95 hover:to-primary/80 shadow-md shadow-primary/30 shrink-0 w-full sm:w-auto"
          onClick={() => navigate("/campaign/create")}
        >
          <Zap className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </header>

      <CampaignListFilters
        state={state}
        total={total}
        onResetFilters={resetFilters}
      />

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          Failed to load campaigns.
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CampaignCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <motion.div
          layout
          className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          <AnimatePresence>
            {entries.map((c) => (
              <CampaignCard key={c._id} item={c} onOpen={handleOpen} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <div className="mt-6 sticky bottom-0 left-0 bg-background flex justify-center py-4 shadow-md w-fit mx-auto rounded-2xl">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={currentPage <= 1}
                className={
                  currentPage <= 1 ? "pointer-events-none opacity-50" : ""
                }
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) setPage(currentPage - 1);
                }}
              />
            </PaginationItem>

            {buildPages().map((p, idx) =>
              p === "..." ? (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink
                    href="#"
                    isActive={p === currentPage}
                    onClick={(e) => {
                      e.preventDefault();
                      if (p !== currentPage) setPage(p as number);
                    }}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              )
            )}

            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={currentPage >= totalPages}
                className={
                  currentPage >= totalPages
                    ? "pointer-events-none opacity-50"
                    : ""
                }
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) setPage(currentPage + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </motion.div>
  );
}

export default CampaignsPage;
