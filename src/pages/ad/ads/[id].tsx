// src/pages/ad/ads/[id].tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Loader2,
  Trash2,
  ArrowLeft,
  Pencil,
  ExternalLink,
  Calendar,
  Link2,
  Tag,
  Image as ImageIcon,
  Video,
} from "lucide-react";

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

import ConfirmArchiveAdModal from "@/components/modals/ad/ad/delete";
import { AdStats } from "@/components/advertisement/ad-stats";

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

function PreviewEmpty({
  title,
  icon,
  hint,
}: {
  title: string;
  icon: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed bg-background/40 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div className="min-w-0">
          <div className="text-sm font-semibold">{title}</div>
          {hint ? (
            <div className="text-xs text-muted-foreground mt-1">{hint}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function SpecificAdPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  const urlWithQuery = useMemo(() => {
    if (!id) return "";
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

  const heroImage =
    Array.isArray(ad?.uploadedImageLinks) && ad?.uploadedImageLinks?.length
      ? ad!.uploadedImageLinks[0]
      : null;

  return (
    <div className="p-6 space-y-6 w-full max-w-6xl mx-auto">
      {/* header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => navigate("/ad/ads")}
            className="shrink-0 rounded-2xl"
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
                <Badge className="shrink-0 rounded-full bg-red-500/15 text-red-200 border border-red-500/30 hover:bg-red-500/15">
                  Archived
                </Badge>
              ) : null}

              {ad?.status ? (
                <Badge
                  variant="secondary"
                  className="shrink-0 rounded-full text-[11px]"
                >
                  {ad.status}
                </Badge>
              ) : null}
            </div>

            <p className="text-xs text-muted-foreground">
              Creative preview + performance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => id && navigate(`/ad/ads/edit/${id}`)}
            disabled={!id || isBusy || archived}
            className="rounded-xl"
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
            className="rounded-xl"
            title={archived ? "Already archived" : "Archive this ad"}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Archive
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertDescription>Failed to load ad.</AlertDescription>
        </Alert>
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
            "rounded-3xl overflow-hidden",
            "bg-gradient-to-b from-primary/10 via-background to-background",
            archived ? "border-red-500/30" : "",
          )}
        >
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <CardTitle className="text-lg font-semibold md:text-xl line-clamp-1">
                  {ad.title}
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-2">
                  <p className="line-clamp-3">{ad.description || "—"}</p>
                </CardDescription>
              </div>

              {/* quick chips */}
              <div className="flex flex-wrap gap-2 md:justify-end">
                <Badge
                  variant="secondary"
                  className="rounded-full text-[11px] px-3 py-1"
                >
                  <Calendar className="h-3.5 w-3.5 mr-1.5 opacity-80" />
                  {fmt(ad.startTime)} → {fmt(ad.endTime)}
                </Badge>

                {ad.buttonText ? (
                  <Badge
                    variant="secondary"
                    className="rounded-full text-[11px] px-3 py-1"
                  >
                    {ad.buttonText}
                  </Badge>
                ) : null}

                {Array.isArray(ad.industries) && ad.industries.length ? (
                  <Badge
                    variant="secondary"
                    className="rounded-full text-[11px] px-3 py-1"
                  >
                    <Tag className="h-3.5 w-3.5 mr-1.5 opacity-80" />
                    {ad.industries.length} industries
                  </Badge>
                ) : null}
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <Separator className="my-4" />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* LEFT: creative + info */}
              <div className="lg:col-span-3 space-y-4">
                {/* Destination */}
                <div className="rounded-2xl border bg-background/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">Destination</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Where the ad sends users
                      </div>
                    </div>

                    {ad.hyperlink ? (
                      <a
                        href={ad.hyperlink}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0"
                        title="Open link"
                      >
                        <Button
                          variant="secondary"
                          size="sm"
                          className="rounded-xl"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open
                        </Button>
                      </a>
                    ) : null}
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <Link2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
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
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      CTA button:{" "}
                      <span className="text-foreground font-medium">
                        {ad.buttonText || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Images */}
                <div className="rounded-2xl border bg-background/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">Images</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Creative assets used in the ad
                      </div>
                    </div>
                    {Array.isArray(ad.uploadedImageLinks) ? (
                      <Badge variant="secondary" className="rounded-full">
                        {ad.uploadedImageLinks.length}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="mt-3">
                    {Array.isArray(ad.uploadedImageLinks) &&
                    ad.uploadedImageLinks.length ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ad.uploadedImageLinks.map((src, i) => (
                          <a
                            key={`${src}-${i}`}
                            href={src}
                            target="_blank"
                            rel="noreferrer"
                            className="group rounded-2xl border overflow-hidden bg-background hover:bg-accent/20 transition"
                            title="Open image"
                          >
                            <div className="relative">
                              <img
                                src={src}
                                alt={`ad-image-${i}`}
                                className="w-full h-44 object-cover"
                              />
                              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/40 via-black/0 to-black/0" />
                              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-white/90 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="truncate">Image {i + 1}</span>
                                <span className="rounded-full bg-black/40 px-2 py-0.5">
                                  View
                                </span>
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <PreviewEmpty
                        title="No images uploaded"
                        icon={<ImageIcon className="h-4 w-4" />}
                        hint="Upload images to improve how the ad renders."
                      />
                    )}
                  </div>
                </div>

                {/* Videos (kept simple, no metadata) */}
                {/* <div className="rounded-2xl border bg-background/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">Videos</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Optional video assets
                      </div>
                    </div>
                    {Array.isArray(ad.uploadedVideoLinks) ? (
                      <Badge variant="secondary" className="rounded-full">
                        {ad.uploadedVideoLinks.length}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="mt-3">
                    {Array.isArray(ad.uploadedVideoLinks) &&
                    ad.uploadedVideoLinks.length ? (
                      <div className="space-y-2">
                        {ad.uploadedVideoLinks.map((src, i) => (
                          <a
                            key={`${src}-${i}`}
                            href={src}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 hover:bg-accent/20 transition"
                            title="Open video"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Video className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-sm truncate">
                                Video {i + 1}
                              </span>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <PreviewEmpty
                        title="No videos uploaded"
                        icon={<Video className="h-4 w-4" />}
                      />
                    )}
                  </div>
                </div> */}

                {/* Industries */}
                <div className="rounded-2xl border bg-background/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">Industries</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Targeted industry tags
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    {Array.isArray(ad.industries) && ad.industries.length ? (
                      <div className="flex flex-wrap gap-2">
                        {ad.industries.map((ind) => (
                          <span
                            key={ind._id}
                            className="px-3 py-1 rounded-full border text-xs bg-background/70 hover:bg-accent/20 transition"
                            title={ind.description ?? ""}
                          >
                            {ind.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <PreviewEmpty
                        title="No industries selected"
                        icon={<Tag className="h-4 w-4" />}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT: preview */}
              <div className="lg:col-span-2">
                <div className="sticky top-6">
                  <div className="rounded-3xl border bg-background/60 p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">Ad preview</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Approximate rendering
                        </div>
                      </div>

                      {archived ? (
                        <Badge className="rounded-full bg-red-500/15 text-red-200 border border-red-500/30 hover:bg-red-500/15">
                          Archived
                        </Badge>
                      ) : null}
                    </div>

                    <div className="mt-4 rounded-3xl border overflow-hidden bg-background">
                      {/* hero */}
                      {heroImage ? (
                        <a
                          href={heroImage}
                          target="_blank"
                          rel="noreferrer"
                          className="block"
                          title="Open hero image"
                        >
                          <div className="relative">
                            <img
                              src={heroImage}
                              alt="ad-hero"
                              className="w-full h-44 object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />
                            <div className="absolute bottom-3 left-3 right-3">
                              <div className="text-white font-semibold text-sm line-clamp-1">
                                {ad.title}
                              </div>
                              <div className="text-white/80 text-xs line-clamp-2 mt-1">
                                {ad.description || "—"}
                              </div>
                            </div>
                          </div>
                        </a>
                      ) : (
                        <div className="h-44 flex items-center justify-center bg-muted/30">
                          <div className="text-center text-xs text-muted-foreground">
                            <ImageIcon className="h-5 w-5 mx-auto mb-2 opacity-70" />
                            No hero image
                          </div>
                        </div>
                      )}

                      {/* preview body */}
                      <div className="p-4 space-y-3">
                        <div className="space-y-1">
                          <div className="text-sm font-semibold line-clamp-1">
                            {ad.title}
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-3">
                            {ad.description || "—"}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {ad.hyperlink ? (
                            <a
                              href={ad.hyperlink}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full"
                            >
                              <Button className="w-full rounded-2xl">
                                {ad.buttonText || "Open"}
                              </Button>
                            </a>
                          ) : (
                            <Button
                              className="w-full rounded-2xl"
                              disabled
                              title="No hyperlink set"
                            >
                              {ad.buttonText || "Open"}
                            </Button>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {fmt(ad.startTime)} → {fmt(ad.endTime)}
                          </span>
                          {ad.status ? (
                            <span className="font-medium">{ad.status}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {ad.hyperlink ? (
                      <a
                        href={ad.hyperlink}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 block"
                      >
                        <Button
                          variant="secondary"
                          className="w-full rounded-2xl"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open destination
                        </Button>
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : !isBusy ? (
        <div className="text-sm text-muted-foreground">No ad found.</div>
      ) : null}

      {/* stats component */}
      {id && <AdStats adId={id} />}

      {/* archive modal */}
      {id ? (
        <ConfirmArchiveAdModal
          isOpen={isArchiveOpen}
          onClose={() => setIsArchiveOpen(false)}
          adId={id}
          onArchived={() => {
            try {
              (refetch as any)?.();
            } catch {}
          }}
        />
      ) : null}
    </div>
  );
}
