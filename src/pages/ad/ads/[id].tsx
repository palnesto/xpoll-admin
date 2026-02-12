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
import { useApiQuery } from "@/hooks/useApiQuery";

import ConfirmArchiveAdModal from "@/components/modals/ad/ad/delete";
import { utcToAdminFormatted } from "@/utils/time";

type Ad = {
  _id: string;
  adOwnerId: string;
  title: string;
  description?: string | null;

  uploadedImageLinks?: string[];
  uploadedVideoLinks?: string[];

  hyperlink?: string | null;
  buttonText?: string | null;

  startTime?: string | null;
  endTime?: string | null;

  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;

  status?: "draft" | "scheduled" | "live" | "ended";
  adOwner?: { _id: string; name: string; description?: string | null } | null;

  industries?: { _id: string; name: string; description?: string | null }[];
};

export default function SpecificAdPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  const urlWithQuery = useMemo(() => {
    if (!id) return "";
    return `/internal/advertisement/ad/${id}?includeArchived=true`;
  }, [id]);

  const { data, isLoading, isFetching, error, refetch } = useApiQuery(
    urlWithQuery,
    {
      key: ["ad-by-id-view", id, urlWithQuery],
      enabled: !!id,
    } as any,
  );

  useEffect(() => {
    if (!urlWithQuery) return;
    try {
      (refetch as any)?.();
    } catch {}
  }, [urlWithQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const ad: Ad | null = (data as any)?.data?.data ?? null;

  const isBusy = isLoading || isFetching;
  const archived = !!ad?.archivedAt;

  const fmt = (iso?: string | null) => (iso ? utcToAdminFormatted(iso) : "—");

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => navigate("/ad/ads")}
            className="shrink-0"
            aria-label="Back"
            title="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-xl font-semibold tracking-wide truncate">
                {ad?.title || "Ad"}
              </h1>

              {archived ? (
                <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full font-semibold bg-red-500/20 text-red-200 border border-red-500/30">
                  Archived
                </span>
              ) : null}

              {ad?.status ? (
                <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full font-semibold border bg-muted/30 text-muted-foreground">
                  {ad.status.toUpperCase()}
                </span>
              ) : null}
            </div>

            <p className="text-xs text-muted-foreground">Ad details</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => id && navigate(`/ad/ads/edit/${id}`)}
            disabled={!id || isBusy || archived}
            title={archived ? "Archived ads cannot be edited" : "Edit ad"}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsArchiveOpen(true)}
            disabled={!id || archived || isBusy}
            title={archived ? "Already archived" : "Archive this ad"}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Archive
          </Button>
        </div>
      </div>

      {error ? (
        <div className="text-red-500 text-sm">Failed to load ad.</div>
      ) : null}

      {isBusy ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading…</span>
        </div>
      ) : null}

      {ad ? (
        <Card
          className={cn(
            "@container/card rounded-3xl",
            archived ? "bg-red-500/10 border-red-500/30" : "bg-primary/5",
          )}
        >
          <CardHeader className="flex flex-col gap-4">
            <div className="min-w-0">
              <CardTitle className="text-lg font-semibold @[250px]/card:text-xl line-clamp-1">
                {ad.title}
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                <p className="whitespace-pre-wrap break-words">
                  {ad.description || "—"}
                </p>
              </CardDescription>
            </div>

            <div className="grid grid-cols-1 gap-3 text-xs text-muted-foreground">
              <div>
                <span className="font-medium">Ad ID:</span>{" "}
                <span className="font-mono break-all">{ad._id}</span>
              </div>
              <div>
                <span className="font-medium">Owner:</span>{" "}
                <span className="font-medium">
                  {ad.adOwner?.name ?? ad.adOwnerId}
                </span>
              </div>
              <div>
                <span className="font-medium">Schedule:</span>{" "}
                {fmt(ad.startTime)} → {fmt(ad.endTime)}
              </div>
              <div>
                <span className="font-medium">Hyperlink:</span>{" "}
                {ad.hyperlink ?? "—"}
              </div>
              <div>
                <span className="font-medium">Button Text:</span>{" "}
                {ad.buttonText ?? "—"}
              </div>
              <div>
                <span className="font-medium">Created:</span>{" "}
                {fmt(ad.createdAt)}
              </div>
              <div>
                <span className="font-medium">Updated:</span>{" "}
                {fmt(ad.updatedAt)}
              </div>
              {archived ? (
                <div>
                  <span className="font-medium">Archived At:</span>{" "}
                  {fmt(ad.archivedAt)}
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-2xl border bg-muted/10 p-4">
                <div className="text-xs text-muted-foreground mb-2">
                  Industries
                </div>
                {Array.isArray(ad.industries) && ad.industries.length ? (
                  <ul className="space-y-1">
                    {ad.industries.map((i) => (
                      <li key={i._id} className="text-sm">
                        <span className="font-medium">{i.name}</span>{" "}
                        <span className="text-xs text-muted-foreground">
                          ({i._id})
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-muted-foreground">—</div>
                )}
              </div>

              <div className="rounded-2xl border bg-muted/10 p-4">
                <div className="text-xs text-muted-foreground mb-2">Media</div>
                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-muted-foreground">Images</div>
                    {Array.isArray(ad.uploadedImageLinks) &&
                    ad.uploadedImageLinks.length ? (
                      <ul className="list-disc pl-5">
                        {ad.uploadedImageLinks.map((x, idx) => (
                          <li key={idx} className="break-all">
                            {x}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-muted-foreground">—</div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground">Videos</div>
                    {Array.isArray(ad.uploadedVideoLinks) &&
                    ad.uploadedVideoLinks.length ? (
                      <ul className="list-disc pl-5">
                        {ad.uploadedVideoLinks.map((x, idx) => (
                          <li key={idx} className="break-all">
                            {x}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-muted-foreground">—</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      ) : !isBusy ? (
        <div className="text-sm text-muted-foreground">No ad found.</div>
      ) : null}

      {id ? (
        <ConfirmArchiveAdModal
          isOpen={isArchiveOpen}
          onClose={() => setIsArchiveOpen(false)}
          adId={id}
        />
      ) : null}
    </div>
  );
}
