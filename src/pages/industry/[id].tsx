// src/pages/industry/[id].tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Trash2, ArrowLeft, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { utcToAdminFormatted } from "@/utils/time";
import ConfirmArchiveIndustryModal from "@/components/modals/industry/delete";

type Industry = {
  _id: string;
  name: string;
  description?: string | null;
  internalAuthor?: string | null;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export default function SpecificIndustryPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  const urlWithQuery = useMemo(() => {
    if (!id) return "";
    return endpoints.entities.industry.getById(
      { industryId: id },
      { includeArchived: "true" },
    );
  }, [id]);

  const { data, isLoading, isFetching, error, refetch } = useApiQuery(
    urlWithQuery,
    { key: ["industry-by-id-view", id, urlWithQuery], enabled: !!id } as any,
  );

  useEffect(() => {
    if (!urlWithQuery) return;
    try {
      (refetch as any)?.();
    } catch {}
  }, [urlWithQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const industry: Industry | null = (data as any)?.data?.data ?? null;

  const isBusy = isLoading || isFetching;
  const archived = !!industry?.archivedAt;

  const fmt = (iso?: string | null) => (iso ? utcToAdminFormatted(iso) : "—");

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => navigate("/industry")}
            className="shrink-0"
            aria-label="Back"
            title="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-xl font-semibold tracking-wide truncate">
                {industry?.name || "Industry"}
              </h1>

              {archived ? (
                <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full font-semibold bg-red-500/20 text-red-200 border border-red-500/30">
                  Archived
                </span>
              ) : null}
            </div>

            <p className="text-xs text-muted-foreground">Industry details</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => id && navigate(`/industry/edit/${id}`)}
            disabled={!id || isBusy || archived}
            title={
              archived
                ? "Archived industries cannot be edited"
                : "Edit industry"
            }
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsArchiveOpen(true)}
            disabled={!id || archived || isBusy}
            title={archived ? "Already archived" : "Archive this industry"}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Archive
          </Button>
        </div>
      </div>

      {error ? (
        <div className="text-red-500 text-sm">Failed to load industry.</div>
      ) : null}

      {isBusy ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      ) : null}

      {industry ? (
        <Card
          className={cn(
            "@container/card rounded-3xl",
            archived ? "bg-red-500/10 border-red-500/30" : "bg-primary/5",
          )}
        >
          <CardHeader className="flex flex-col gap-4">
            <div className="min-w-0">
              <CardTitle className="text-lg font-semibold @[250px]/card:text-xl line-clamp-1">
                {industry.name}
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                <p className="line-clamp-2">{industry.description || "—"}</p>
              </CardDescription>
            </div>

            <div className="grid grid-cols-1 gap-3 text-xs text-muted-foreground">
              <div>
                <span className="font-medium">Industry ID:</span>{" "}
                <span className="font-mono break-all">{industry._id}</span>
              </div>
              <div>
                <span className="font-medium">Created:</span>{" "}
                {fmt(industry.createdAt)}
              </div>
              <div>
                <span className="font-medium">Updated:</span>{" "}
                {fmt(industry.updatedAt)}
              </div>
              {archived ? (
                <div>
                  <span className="font-medium">Archived At:</span>{" "}
                  {fmt(industry.archivedAt)}
                </div>
              ) : null}
            </div>
          </CardHeader>
        </Card>
      ) : !isBusy ? (
        <div className="text-sm text-muted-foreground">No industry found.</div>
      ) : null}

      {id ? (
        <ConfirmArchiveIndustryModal
          isOpen={isArchiveOpen}
          onClose={() => setIsArchiveOpen(false)}
          industryId={id}
        />
      ) : null}
    </div>
  );
}
