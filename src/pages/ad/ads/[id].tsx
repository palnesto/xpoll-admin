// src/pages/ad/ads/[id].tsx

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

import ConfirmArchiveAdModal from "@/components/modals/ad/ad/delete";

type Industry = {
  _id: string;
  name: string;
  description?: string | null;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type Ad = {
  _id: string;
  adOwnerId: string;
  internalAuthor?: string | null;
  title: string;
  description: string;
  uploadedImageLinks: string[];
  uploadedVideoLinks: string[];
  hyperlink?: string | null;
  buttonText?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  status?: string | null;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  industries?: Industry[];
};

export default function SpecificAdPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  const urlWithQuery = useMemo(() => {
    if (!id) return "";
    console.log("id", id);
    // ✅ Your endpoint builder (note: parameter name is "adOwnerId" but it is actually adId)
    return endpoints.entities.ad.ad.getById(
      { adId: id },
      { includeArchived: "true" },
    );
  }, [id]);

  const { data, isLoading, isFetching, error, refetch } = useApiQuery(
    urlWithQuery,
    { enabled: !!id } as any,
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
      {/* header */}
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

          {/* ✅ Delete / Archive button */}
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

      {/* body */}
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
                <p className="line-clamp-3">{ad.description || "—"}</p>
              </CardDescription>
            </div>

            <div className="grid grid-cols-1 gap-3 text-xs text-muted-foreground">
              <div>
                <span className="font-medium">Ad ID:</span>{" "}
                <span className="font-mono break-all">{ad._id}</span>
              </div>

              <div>
                <span className="font-medium">Ad Owner ID:</span>{" "}
                <span className="font-mono break-all">{ad.adOwnerId}</span>
              </div>

              <div>
                <span className="font-medium">Status:</span>{" "}
                <span className="font-mono">{ad.status || "—"}</span>
              </div>

              <div>
                <span className="font-medium">Start:</span> {fmt(ad.startTime)}
              </div>

              <div>
                <span className="font-medium">End:</span> {fmt(ad.endTime)}
              </div>

              <div>
                <span className="font-medium">Hyperlink:</span>{" "}
                {ad.hyperlink ? (
                  <a
                    href={ad.hyperlink}
                    target="_blank"
                    rel="noreferrer"
                    className="underline break-all"
                  >
                    {ad.hyperlink}
                  </a>
                ) : (
                  "—"
                )}
              </div>

              <div>
                <span className="font-medium">Button Text:</span>{" "}
                {ad.buttonText || "—"}
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

            {/* Images */}
            <div className="pt-2 space-y-2">
              <div className="text-xs font-medium text-foreground/80">
                Images
              </div>
              {Array.isArray(ad.uploadedImageLinks) &&
              ad.uploadedImageLinks.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ad.uploadedImageLinks.map((src, i) => (
                    <a
                      key={`${src}-${i}`}
                      href={src}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border overflow-hidden hover:opacity-90"
                      title="Open image"
                    >
                      <img
                        src={src}
                        alt={`ad-image-${i}`}
                        className="w-full h-40 object-cover"
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">—</div>
              )}
            </div>

            {/* Industries */}
            <div className="pt-2 space-y-2">
              <div className="text-xs font-medium text-foreground/80">
                Industries
              </div>
              {Array.isArray(ad.industries) && ad.industries.length ? (
                <div className="flex flex-wrap gap-2">
                  {ad.industries.map((ind) => (
                    <span
                      key={ind._id}
                      className="px-3 py-1 rounded-full border text-xs bg-background"
                      title={ind.description ?? ""}
                    >
                      {ind.name}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">—</div>
              )}
            </div>
          </CardHeader>
        </Card>
      ) : !isBusy ? (
        <div className="text-sm text-muted-foreground">No ad found.</div>
      ) : null}

      {/* ✅ archive modal */}
      {id ? (
        <ConfirmArchiveAdModal
          isOpen={isArchiveOpen}
          onClose={() => setIsArchiveOpen(false)}
          adId={id}
          onArchived={() => {
            // after archive, refetch to show Archived badge
            try {
              (refetch as any)?.();
            } catch {}
          }}
        />
      ) : null}
    </div>
  );
}
