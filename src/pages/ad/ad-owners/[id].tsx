// src/pages/ad/ad-owners/[id].tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Trash2, ArrowLeft, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { utcToAdminFormatted } from "@/utils/time";

import ConfirmArchiveAdOwnerModal from "@/components/modals/ad/ad-owner/delete";

type AdOwner = {
  _id: string;
  name: string;
  description?: string | null;
  internalAuthor?: string | null;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export default function SpecificAdOwnerPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  const urlWithQuery = useMemo(() => {
    if (!id) return "";
    return endpoints.entities.ad.adOwners.getById(
      { adOwnerId: id },
      { includeArchived: "true" },
    );
  }, [id]);

  const { data, isLoading, isFetching, error, refetch } = useApiQuery(
    urlWithQuery,
    { key: ["ad-owner-by-id-view", id, urlWithQuery], enabled: !!id } as any,
  );

  useEffect(() => {
    if (!urlWithQuery) return;
    try {
      (refetch as any)?.();
    } catch {}
  }, [urlWithQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const owner: AdOwner | null = (data as any)?.data?.data ?? null;

  const isBusy = isLoading || isFetching;
  const archived = !!owner?.archivedAt;

  const fmt = (iso?: string | null) => (iso ? utcToAdminFormatted(iso) : "—");

  return (
    <div className="p-6 space-y-6 w-full max-w-5xl mx-auto">
      {/* header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => navigate("/ad/ad-owners")}
            className="shrink-0 rounded-2xl"
            aria-label="Back"
            title="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-xl font-semibold tracking-wide truncate">
                {owner?.name || "Ad Owner"}
              </h1>

              {archived ? (
                <Badge className="shrink-0 rounded-full bg-red-500/15 text-red-200 border border-red-500/30 hover:bg-red-500/15">
                  Archived
                </Badge>
              ) : null}
            </div>

            <p className="text-xs text-muted-foreground">Owner details</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => id && navigate(`/ad/ad-owners/edit/${id}`)}
            disabled={!id || isBusy || archived}
            className="rounded-xl"
            title={archived ? "Archived owners cannot be edited" : "Edit owner"}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsArchiveOpen(true)}
            disabled={!id || archived || isBusy}
            className="rounded-xl"
            title={archived ? "Already archived" : "Archive this owner"}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Archive
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertDescription>Failed to load ad owner.</AlertDescription>
        </Alert>
      ) : null}

      {isBusy ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      ) : null}

      {owner ? (
        <Card
          className={cn(
            "rounded-3xl overflow-hidden",
            "bg-gradient-to-b from-primary/10 via-background to-background",
            archived ? "border-red-500/30" : "",
          )}
        >
          <CardHeader className="pb-3">
            <div className="min-w-0">
              <CardTitle className="text-lg font-semibold md:text-xl line-clamp-1">
                {owner.name}
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                <p className="line-clamp-3 break-words">
                  {owner.description?.trim() ? owner.description : "—"}
                </p>
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <Separator className="my-4" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div className="rounded-2xl border bg-background/50 p-3">
                <div className="text-[11px] uppercase tracking-wide opacity-80">
                  Owner ID
                </div>
                <div className="font-mono break-all mt-1 text-foreground/90">
                  {owner._id}
                </div>
              </div>

              <div className="rounded-2xl border bg-background/50 p-3">
                <div className="text-[11px] uppercase tracking-wide opacity-80">
                  Created
                </div>
                <div className="mt-1 tabular-nums">{fmt(owner.createdAt)}</div>
              </div>

              <div className="rounded-2xl border bg-background/50 p-3">
                <div className="text-[11px] uppercase tracking-wide opacity-80">
                  Updated
                </div>
                <div className="mt-1 tabular-nums">{fmt(owner.updatedAt)}</div>
              </div>

              {archived ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3">
                  <div className="text-[11px] uppercase tracking-wide opacity-80 text-red-200">
                    Archived At
                  </div>
                  <div className="mt-1 tabular-nums text-red-100">
                    {fmt(owner.archivedAt)}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border bg-background/50 p-3">
                  <div className="text-[11px] uppercase tracking-wide opacity-80">
                    Status
                  </div>
                  <div className="mt-1">Active</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : !isBusy ? (
        <div className="text-sm text-muted-foreground">No owner found.</div>
      ) : null}

      {id ? (
        <ConfirmArchiveAdOwnerModal
          isOpen={isArchiveOpen}
          onClose={() => setIsArchiveOpen(false)}
          adOwnerId={id}
        />
      ) : null}
    </div>
  );
}
