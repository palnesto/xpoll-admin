import { useEffect, useCallback, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, FileText, Link as LinkIcon, X } from "lucide-react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { queryClient } from "@/api/queryClient";
import { endpoints } from "@/api/endpoints";
import { FullScreenLoader } from "@/components/full-screen-loader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TipTap } from "@/components/editor/tiptap";
import { ImageSlot } from "@/components/commons/image-slot";
import EasyReactCropper from "@/components/commons/image-cropper";
import { MediaDropzone } from "@/components/commons/MediaDropzone";
import CountrySelect from "@/components/commons/selects/country-select";
import StateSelect from "@/components/commons/selects/state-select";
import CitySelect from "@/components/commons/selects/city-select";
import IndustryInfiniteSelect from "@/components/commons/selects/industry-infinite-select";
import { useInkdBlogEditStore, type GeoOption, type IndustryOption } from "@/stores/inkd-blog-edit.store";
import { useImageUpload, useVideoUpload } from "@/hooks/upload/useAssetUpload";
import { extractYouTubeId } from "@/utils/youtube";
import { cropImage, type CropRect } from "@/utils/media/cropImage";
import { compressImage, COMPRESS_QUALITY } from "@/utils/media/compressImage";
import { fileToDataUrl } from "@/utils/fileToDataUrl";
import { appToast } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { blogFormSchema, type BlogForm } from "../../../../../../../schema/inkd-blog-edit.validation"; 
import { detectMediaType, detectMediaState } from "../../../../../../../components/inkd/inkd-blog-edit.media";
import { ACCEPT_IMAGE, BLOG_MAX_IMAGE_MB, BLOG_MAX_VIDEO_MB, CROP_VIEW_H, CROP_VIEW_W, INPUT_CLASS, MAX_IMAGE_BYTES, MAX_TARGETED_INDUSTRIES, MAX_VIDEO_BYTES, MIN_TARGETED_INDUSTRIES } from "@/constants/inkd";
import { InkdBlogData, MediaState, MediaType } from "@/components/types/inkd";
import { isValidExternalLink, normalizeExternalLink, safeArr } from "@/utils/inkd-blog-edit.utils";

async function buildMediaPayload(opts: {
  mediaType: MediaType;
  media: MediaState;
  youtubeDraft: string;
  uploadImage: (f: File) => Promise<string | null>;
  uploadVideo: (f: File) => Promise<string | null>;
}) {
  const { mediaType, media, youtubeDraft, uploadImage, uploadVideo } = opts;
  const empty = { uploadedImageLinks: [] as string[], uploadedVideoLinks: [] as string[], ytVideoLinks: [] as string[] };
  if (mediaType === "none") return empty;
  if (mediaType === "youtube") {
    const id = (media.type === "youtube" ? media.ytIds?.[0] : null) || extractYouTubeId(youtubeDraft) || null;
    if (!id) throw new Error("Enter a valid YouTube URL or video ID");
    return { ...empty, ytVideoLinks: [id] };
  }
  if (mediaType === "image") {
    if (media.type !== "image") return empty;
    const f = media.files?.[0] ?? null;
    if (f) {
      if (f.size > MAX_IMAGE_BYTES) throw new Error("Image must be <= 20MB");
      const url = await uploadImage(f);
      if (!url || !url.startsWith("http")) throw new Error("Image upload failed");
      return { ...empty, uploadedImageLinks: [url] };
    }
    const url = media.urls?.[0] || media.previews?.[0] || "";
    if (url.startsWith("http")) return { ...empty, uploadedImageLinks: [String(url)] };
    return empty;
  }
  if (mediaType === "video") {
    if (media.type !== "video") return empty;
    const f = media.files?.[0] ?? null;
    if (f) {
      if (f.size > MAX_VIDEO_BYTES) throw new Error("Video must be <= 40MB");
      const url = await uploadVideo(f);
      if (!url || !url.startsWith("http")) throw new Error("Video upload failed");
      return { ...empty, uploadedVideoLinks: [url] };
    }
    const url = media.urls?.[0] || media.previews?.[0] || "";
    if (url.startsWith("http")) return { ...empty, uploadedVideoLinks: [String(url)] };
    return empty;
  }
  return empty;
}

export default function InkdBlogEditPage() {
  const navigate = useNavigate();
  const { inkdInternalAgentId, inkdBlogId } = useParams<{ inkdInternalAgentId: string; inkdBlogId: string }>();
  const { uploadImage } = useImageUpload();
  const { uploadVideo } = useVideoUpload();

  const { user } = useAdminAuth();
  const userId = String(user?.id ?? "");
  const blogRoute = endpoints.entities.inkd.blogs.getById(inkdBlogId ?? "");

  const { data: blogResp } = useApiQuery(blogRoute, {
    queryKey: ["inkd-blog-edit", inkdBlogId],
    enabled: !!inkdBlogId,
  } as any);

  const {
    getDraft,
    setDraft,
    setPatch,
    clear: clearEditStore,
    isExpired,
    loadFromLocalStorage,
  } = useInkdBlogEditStore();

  const blog = useMemo(() => {
    const b = blogResp?.data?.data ?? blogResp?.data ?? null;
    if (!b) return null;
    return { ...b, _id: String(b._id) } as InkdBlogData;
  }, [blogResp]);

  const form = useForm<BlogForm>({
    resolver: zodResolver(blogFormSchema),
    defaultValues: { title: "", description: "", externalLinks: [""] },
    mode: "onChange",
  });

  const [countryOpts, setCountryOpts] = useState<GeoOption[]>([]);
  const [stateOpts, setStateOpts] = useState<GeoOption[]>([]);
  const [cityOpts, setCityOpts] = useState<GeoOption[]>([]);
  const [industryOpts, setIndustryOpts] = useState<IndustryOption[]>([]);
  const [mediaType, setMediaType] = useState<MediaType>("none");
  const [media, setMedia] = useState<MediaState>({ type: "none" });
  const [youtubeDraft, setYoutubeDraft] = useState("");
  const [industryPickerKey, setIndustryPickerKey] = useState(0);

  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const pickedFileRef = useRef<File | null>(null);
  const cropperRef = useRef<{ getCroppedAreaPixels: () => unknown } | null>(null);
  const [cropUIOpen, setCropUIOpen] = useState(false);
  const [cropperImageUrl, setCropperImageUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const extLinks = form.watch("externalLinks") || [""];
  const imagePreviewUrl = media.type === "image" ? (media.urls?.[0] || media.previews?.[0] || null) : null;
  const videoPreviewUrl = media.type === "video" ? (media.urls?.[0] || media.previews?.[0] || null) : null;

  const revokeBlob = useCallback((url: string | null) => {
    if (url?.startsWith("blob:")) try { URL.revokeObjectURL(url); } catch {}
  }, []);

  const removeImage = useCallback(() => {
    const m = media as { type: string; urls?: string[] };
    if (m.type === "image" && m.urls?.[0]?.startsWith("blob:")) revokeBlob(m.urls[0]);
    setMedia({ type: "none" });
    pickedFileRef.current = null;
    if (cropperImageUrl?.startsWith("blob:")) revokeBlob(cropperImageUrl);
    setCropperImageUrl(null);
    setCropUIOpen(false);
  }, [media, cropperImageUrl, revokeBlob]);

  const removeVideo = useCallback(() => {
    const m = media as { type: string; urls?: string[] };
    if (m.type === "video" && m.urls?.[0]?.startsWith("blob:")) revokeBlob(m.urls[0]);
    setMedia({ type: "none" });
  }, [media, revokeBlob]);

  const openImagePicker = () => fileRef.current?.click();
  const openVideoPicker = () => videoRef.current?.click();

  const applyImage = useCallback(async (file: File) => {
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"].includes(file.type)) return;
    if (file.size > MAX_IMAGE_BYTES) return;
    setYoutubeDraft("");
    const m = media as { type: string; urls?: string[] };
    revokeBlob(m.type === "image" ? m.urls?.[0] ?? null : null);
    pickedFileRef.current = file;
    if (file.type === "image/gif") {
      const dataUrl = await fileToDataUrl(file);
      setMedia({ type: "image", files: [file], urls: [dataUrl], previews: [dataUrl] });
      return;
    }
    const blobUrl = URL.createObjectURL(file);
    setCropperImageUrl(blobUrl);
    setCropUIOpen(true);
    const dataUrl = await fileToDataUrl(file);
    setMedia({ type: "image", files: [file], urls: [dataUrl], previews: [dataUrl] });
  }, [media, revokeBlob]);

  const onImgDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    await applyImage(file);
  }, [applyImage]);

  const handleSaveCrop = useCallback(async () => {
    if (!cropperImageUrl) return;
    const area = cropperRef.current?.getCroppedAreaPixels?.() as CropRect | null | undefined;
    if (!area || typeof area.x !== "number") return;
    const file = pickedFileRef.current;
    try {
      const { file: croppedFile } = await cropImage(cropperImageUrl, area, {
        mime: file?.type,
        fileName: "blog-cover",
        quality: COMPRESS_QUALITY,
      });
      if (!croppedFile) return;
      const toUpload = file?.type === "image/gif" ? croppedFile : await compressImage(croppedFile);
      const previewUrl = URL.createObjectURL(toUpload);
      const m = media as { type: string; urls?: string[] };
      revokeBlob(m.type === "image" ? m.urls?.[0] ?? null : null);
      setMedia({ type: "image", files: [toUpload], urls: [previewUrl], previews: [previewUrl] });
    } catch (err) {
      console.error(err);
    } finally {
      if (cropperImageUrl?.startsWith("blob:")) revokeBlob(cropperImageUrl);
      setCropperImageUrl(null);
      setCropUIOpen(false);
    }
  }, [cropperImageUrl, media, revokeBlob]);

  const closeCropper = useCallback(() => {
    if (cropperImageUrl?.startsWith("blob:")) revokeBlob(cropperImageUrl);
    setCropperImageUrl(null);
    setCropUIOpen(false);
  }, [cropperImageUrl, revokeBlob]);

  const onMediaTypeChange = useCallback((next: MediaType) => {
    if (next === mediaType) return;
    setMediaType(next);
  }, [mediaType]);

  const onVideoFile = useCallback((file: File | null) => {
    if (!file) return;
    if (file.type !== "video/mp4") return;
    if (file.size > MAX_VIDEO_BYTES) return;
    removeImage();
    setYoutubeDraft("");
    const m = media as { type: string; urls?: string[] };
    revokeBlob(m.type === "video" ? m.urls?.[0] ?? null : null);
    pickedFileRef.current = null;
    const blobUrl = URL.createObjectURL(file);
    setMedia({ type: "video", files: [file], urls: [blobUrl], previews: [blobUrl] });
  }, [media, removeImage, revokeBlob]);

  const mediaWithUrls = media as { type: string; urls?: string[]; files?: File[] };
  const hasImage = mediaWithUrls.type === "image" && (!!mediaWithUrls.urls?.[0] || !!mediaWithUrls.files?.[0]);
  const hasVideo = mediaWithUrls.type === "video" && (!!mediaWithUrls.urls?.[0] || !!mediaWithUrls.files?.[0]);
  const hasYoutube = !!(youtubeDraft && String(extractYouTubeId(youtubeDraft) ?? "").trim());
  const hasMultipleMedia = [hasImage, hasVideo, hasYoutube].filter(Boolean).length > 1;

  const mediaValid = useMemo(() => {
    if (mediaType === "none") return true;
    if (mediaType === "youtube") {
      const id = (media.type === "youtube" ? media.ytIds?.[0] : null) || extractYouTubeId(youtubeDraft) || "";
      return Boolean(String(id).trim());
    }
    if (mediaType === "image") {
      if (media.type !== "image") return false;
      const f = media.files?.[0];
      if (f) return f.size <= MAX_IMAGE_BYTES;
      const url = media.urls?.[0] || media.previews?.[0] || "";
      return url.startsWith("http");
    }
    if (mediaType === "video") {
      if (media.type !== "video") return false;
      const f = media.files?.[0];
      if (f) return f.size <= MAX_VIDEO_BYTES;
      const url = media.urls?.[0] || media.previews?.[0] || "";
      return url.startsWith("http");
    }
    return true;
  }, [mediaType, media, youtubeDraft]);

  const { mutateAsync: updateBlog, isPending: updatePending } = useApiMutation<any, any>({
    route: inkdBlogId ? endpoints.entities.inkd.blogs.update(inkdBlogId) : "",
    method: "PATCH",
    onSuccess: () => {
      if (userId) clearEditStore(userId);
      queryClient.invalidateQueries({ queryKey: ["inkd-blog-details", inkdBlogId] });
      queryClient.invalidateQueries({ queryKey: ["inkd-blog-edit", inkdBlogId] });
      appToast.success("Blog updated");
      if (inkdInternalAgentId && inkdBlogId) {
        navigate(`/inkd/inkd-internal-agents/details/${inkdInternalAgentId}/inkd-blogs/details/${inkdBlogId}`);
      } else navigate(-1);
    },
  });

  useEffect(() => {
    if (!blog || !inkdBlogId || !userId) return;
    loadFromLocalStorage(userId);
    const draft = getDraft();
    const useStore = draft && !isExpired() && draft.blogId === inkdBlogId;

    const geo = blog.targetGeo ?? { countries: [], states: [], cities: [] };
    const countryOptsInit = (geo.countries ?? []).map((c) => ({ value: c, label: c }));
    const stateOptsInit = (geo.states ?? []).map((s) => ({ value: s, label: s }));
    const cityOptsInit = (geo.cities ?? []).map((c) => ({ value: c, label: c }));
    const industryOptsInit = (blog.linkedIndustries ?? []).map((i) => ({ value: i._id, label: i.name }));
    const ext = (blog.externalLinks ?? []).map(normalizeExternalLink).filter(isValidExternalLink).slice(0, 50);

    if (useStore && draft.draft) {
      const d = draft.draft;
      form.reset({
        title: String(d.title ?? blog.title),
        description: String(d.description ?? blog.description),
        externalLinks: (d.externalLinks?.length ? d.externalLinks : [""]).slice(0, 50),
      });
      setCountryOpts(d.targetGeo?.countries?.map((c) => ({ value: c, label: c })) ?? countryOptsInit);
      setStateOpts(d.targetGeo?.states?.map((s) => ({ value: s, label: s })) ?? stateOptsInit);
      setCityOpts(d.targetGeo?.cities?.map((c) => ({ value: c, label: c })) ?? cityOptsInit);
      setIndustryOpts(d.industryOpts ?? industryOptsInit);
    } else {
      form.reset({
        title: String(blog.title ?? ""),
        description: String(blog.description ?? ""),
        externalLinks: ext.length ? ext : [""],
      });
      setCountryOpts(countryOptsInit);
      setStateOpts(stateOptsInit);
      setCityOpts(cityOptsInit);
      setIndustryOpts(industryOptsInit);
      setDraft({
        blogId: inkdBlogId,
        inkdInternalAgentId: inkdInternalAgentId ?? null,
        expireAt: Date.now() + 30 * 60 * 1000,
        draft: {
          title: String(blog.title ?? ""),
          description: String(blog.description ?? ""),
          externalLinks: ext.length ? ext : [""],
          targetGeo: blog.targetGeo,
          industryIds: industryOptsInit.map((i) => i.value),
          industryOpts: industryOptsInit,
        },
      });
    }

    setMediaType(detectMediaType(blog));
    setMedia(detectMediaState(blog));
    const ytId = safeArr(blog.ytVideoLinks)[0] || "";
    setYoutubeDraft((prev) => prev || (ytId ? `https://youtu.be/${ytId}` : ""));
  }, [blog, inkdBlogId, inkdInternalAgentId, userId]);

  useEffect(() => {
    if (!inkdBlogId || !userId) return;
    const sub = form.watch((values) => {
      setPatch(userId, {
        title: values.title,
        description: values.description,
        externalLinks: safeArr(values.externalLinks).map((x) => String(x ?? "")).slice(0, 50),
        targetGeo:
          countryOpts.length || stateOpts.length || cityOpts.length
            ? {
                countries: countryOpts.map((c) => c.value),
                states: stateOpts.map((s) => s.value),
                cities: cityOpts.map((c) => c.value),
              }
            : null,
        industryIds: industryOpts.map((i) => i.value),
        industryOpts,
      });
    });
    return () => sub.unsubscribe();
  }, [inkdBlogId, userId, setPatch, countryOpts, stateOpts, cityOpts, industryOpts]);

  const addLinkRow = () => {
    const cur = safeArr<string>(extLinks).slice(0, 50);
    if (cur.length >= 50) return;
    form.setValue("externalLinks", [...cur, ""], { shouldDirty: true, shouldValidate: true });
  };

  const removeLinkRow = (idx: number) => {
    const cur = safeArr<string>(extLinks).slice(0, 50);
    const next = cur.filter((_, i) => i !== idx);
    form.setValue("externalLinks", next.length ? next : [""], { shouldDirty: true, shouldValidate: true });
  };

  const addIndustry = (opt: { value: string; label: string } | null) => {
    if (!opt) return;
    if (industryOpts.length >= MAX_TARGETED_INDUSTRIES) return;
    if (industryOpts.some((i) => i.value === opt.value)) {
      setIndustryPickerKey((k) => k + 1);
      return;
    }
    setIndustryOpts((prev) => [...prev, { value: opt.value, label: opt.label }]);
    setIndustryPickerKey((k) => k + 1);
  };

  const removeIndustry = (value: string) => {
    setIndustryOpts((prev) => prev.filter((i) => i.value !== value));
  };

  const industriesOverLimit = industryOpts.length > MAX_TARGETED_INDUSTRIES;
  const isDisabled =
    updatePending ||
    form.formState.isSubmitting ||
    !form.formState.isValid ||
    !mediaValid ||
    hasMultipleMedia ||
    industriesOverLimit;

  const onSave = form.handleSubmit(async (vals) => {
    if (!inkdBlogId) return;
    if (industryOpts.length > MAX_TARGETED_INDUSTRIES) {
      appToast.error(`Targeted industries: max ${MAX_TARGETED_INDUSTRIES} allowed`);
      return;
    }
    try {
      const title = String(vals.title || "").trim();
      const description = String(vals.description || "");
      const externalLinks = safeArr(vals.externalLinks)
        .map((x) => String(x ?? "").trim())
        .filter(Boolean)
        .map(normalizeExternalLink)
        .filter(isValidExternalLink);

      const mediaPayload = await buildMediaPayload({
        mediaType,
        media,
        youtubeDraft,
        uploadImage,
        uploadVideo,
      });

      await updateBlog({
        title,
        description,
        externalLinks,
        targetGeo:
          countryOpts.length || stateOpts.length || cityOpts.length
            ? {
                countries: countryOpts.map((c) => c.value).filter(Boolean),
                states: stateOpts.map((s) => s.value).filter(Boolean),
                cities: cityOpts.map((c) => c.value).filter(Boolean),
              }
            : null,
        industryIds: industryOpts.map((i) => i.value),
        ...mediaPayload,
      });
    } catch (e: any) {
      appToast.error(e?.response?.data?.message ?? e?.message ?? "Update failed");
    }
  });

  if (!blog && blogResp !== undefined) {
    return <FullScreenLoader />;
  }

  if (!blog?._id) {
    return (
      <div className="p-4 text-center text-[#666]">
        Failed to load blog.
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4"> 
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rrounded-full bg-[#ececec] text-[#2a2a2a] border-b-2 border-b-white px-2 py-2 hover:bg-black/70"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-7" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-[#111]">Edit Blog</h1>
              <h2 className="text-xs text-black/50">InkD agent blog</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={isDisabled}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold text-white transition",
              isDisabled ? "cursor-not-allowed bg-[#727DD5] opacity-70" : "bg-[#727DD5] hover:bg-[#727DD590]"
            )}
          >
            {updatePending || form.formState.isSubmitting ? "Saving..." : "Save Blog"}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <span className="flex items-center justify-between">
                <h2 className="font-semibold text-[#111]">
                  Blog name <span className="text-red-500">*</span>
                </h2>
                <p className="text-xs text-gray-500">Max 2000 characters</p>
              </span>
              <Input
                {...form.register("title")}
                className={INPUT_CLASS}
                placeholder="Blog title"
              />
              {form.formState.errors.title?.message && (
                <p className="text-xs text-red-600">{String(form.formState.errors.title.message)}</p>
              )}
            </div>

            <div className="rounded-xl border border-black/10 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 font-semibold text-[#111]">
                  <LinkIcon className="h-4 w-4" />
                  Links (max 50)
                </div>
                <button
                  type="button"
                  onClick={addLinkRow}
                  disabled={safeArr(extLinks).length >= 50}
                  className="rounded-full bg-[#E4F2DF] px-3 py-1 text-[11px] font-semibold text-[#315326] disabled:opacity-60"
                >
                  + Add link
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {safeArr(extLinks).slice(0, 50).map((_, idx) => (
                  <div key={idx} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Input
                        value={String(extLinks[idx] ?? "")}
                        onChange={(e) => {
                          const next = safeArr<string>(extLinks).slice(0, 50);
                          next[idx] = e.target.value;
                          form.setValue("externalLinks", next, { shouldDirty: true, shouldValidate: true });
                        }}
                        placeholder="https://example.com or example.com"
                        className={cn(INPUT_CLASS, (form.formState.errors?.externalLinks as any)?.[idx] && "border-red-500")}
                      />
                      <button type="button" onClick={() => removeLinkRow(idx)} className="rounded-lg p-2 hover:bg-black/5">
                        <X className="h-4 w-4 text-black/60" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-black/10 bg-white p-4">
              <section className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-[#111]">Media</h2>
                <div className="flex flex-wrap gap-2">
                  {(["image", "video", "youtube", "none"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onMediaTypeChange(t)}
                      className={cn(
                        "rounded-full border px-2 py-1.5 text-[10px] font-semibold xl:px-3 xl:text-[12px]",
                        mediaType === t ? "border-gray-300 bg-[#EDEDED]" : "border-black/10 bg-white text-black/60 hover:bg-black/5"
                      )}
                    >
                      {t === "image" ? "Image" : t === "video" ? "Video" : t === "youtube" ? "YouTube" : "No Media"}
                    </button>
                  ))}
                </div>
              </section>
              {hasMultipleMedia && (
                <p className="mt-2 text-xs text-red-600">Only one media type allowed.</p>
              )}
              {mediaType === "image" && (
                <div className="mt-3">
                  <p className="mb-2 text-sm text-black/60">JPG, PNG, WEBP, GIF. Max {BLOG_MAX_IMAGE_MB} MB.</p>
                  <div
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.dataTransfer?.types?.includes("Files")) setDragOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "copy";
                    }}
                    onDrop={onImgDrop}
                    className={cn("relative rounded-xl transition-all", dragOver && "ring-2 ring-[#78BC61] ring-dashed")}
                  >
                    <ImageSlot
                      size="big"
                      value={imagePreviewUrl ?? null}
                      onPick={openImagePicker}
                      onRemove={removeImage}
                    />
                    {dragOver && (
                      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-black/10">
                        <span className="rounded-full bg-white/90 px-3 py-1 text-xs">Drop to upload</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept={ACCEPT_IMAGE}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) applyImage(f);
                      e.currentTarget.value = "";
                    }}
                  />
                  {cropUIOpen && cropperImageUrl && (
                    <div className="mt-4 rounded-xl border border-black/10 bg-white p-4">
                      <p className="mb-2 text-sm font-medium text-[#5E6366]">Crop image</p>
                      <div className="relative overflow-hidden rounded-lg bg-[#dfd7d7]" style={{ height: CROP_VIEW_H }}>
                        <EasyReactCropper
                          key={cropperImageUrl}
                          image={cropperImageUrl}
                          ref={cropperRef as any}
                          width={CROP_VIEW_W}
                          height={CROP_VIEW_H}
                        />
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button type="button" variant="outline" onClick={closeCropper}>Cancel</Button>
                        <Button type="button" onClick={handleSaveCrop}>Apply Crop</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {mediaType === "video" && (
                <div className="mt-3">
                  <p className="mb-2 text-sm text-black/60">MP4 only. Max {BLOG_MAX_VIDEO_MB} MB.</p>
                  <MediaDropzone
                    accept="video/mp4"
                    onFiles={(files: File[]) => {
                      const f = files[0];
                      if (f) onVideoFile(f);
                    }}
                    onPickClick={openVideoPicker}
                    className={cn("rounded-xl border border-black/10 p-3", !videoPreviewUrl && "min-h-[170px]")}
                  >
                    <div className={cn("flex-1", !videoPreviewUrl && "flex min-h-[240px]")} onClick={(e) => e.stopPropagation()}>
                      {videoPreviewUrl ? (
                        <div>
                          <video
                            src={videoPreviewUrl}
                            playsInline
                            controls
                            muted
                            className="h-[200px] w-full rounded-lg bg-black/5 object-cover"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Button type="button" variant="outline" onClick={(e) => { e.stopPropagation(); removeVideo(); }} className="mt-2">Remove</Button>
                          <Button type="button" variant="outline" onClick={(e) => { e.stopPropagation(); openVideoPicker(); }} className="ml-2 mt-2">Replace</Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openVideoPicker(); }}
                          className="flex min-h-[170px] w-full items-center justify-center rounded-lg border border-dashed border-black/15 px-3 py-6"
                        >
                          <div className="flex items-center gap-2 text-xs text-[#315326]">
                            <FileText className="h-4 w-4 text-[#78BC61]" /> + Upload video (MP4, max {BLOG_MAX_VIDEO_MB} MB)
                          </div>
                        </button>
                      )}
                    </div>
                  </MediaDropzone>
                  <input
                    ref={videoRef}
                    type="file"
                    accept="video/mp4"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      onVideoFile(file);
                      e.currentTarget.value = "";
                    }}
                  />
                </div>
              )}
              {mediaType === "youtube" && (
                <div className="mt-3 rounded-xl border border-black/10 bg-[#F7F7F7] p-3">
                  <Label>YouTube URL or Video ID</Label>
                  <Input
                    className={cn("mt-2", INPUT_CLASS)}
                    placeholder="Paste YouTube link or 11-char ID"
                    value={youtubeDraft}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v?.trim()) {
                        removeImage();
                        removeVideo();
                      }
                      setYoutubeDraft(v);
                    }}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#5E6366]">Country</Label>
                <CountrySelect value={countryOpts} onChange={(opts) => setCountryOpts(opts as GeoOption[])} placeholder="Search countries..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#5E6366]">State</Label>
                <StateSelect value={stateOpts} onChange={(opts) => setStateOpts(opts as GeoOption[])} placeholder="Search states..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-[#5E6366]">City</Label>
                <CitySelect value={cityOpts} onChange={(opts) => setCityOpts(opts as GeoOption[])} placeholder="Search cities..." />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#5E6366]">
                Targeted Industries (min {MIN_TARGETED_INDUSTRIES}, max {MAX_TARGETED_INDUSTRIES})
              </Label>
              <IndustryInfiniteSelect
                key={industryPickerKey}
                onChange={(opt) => addIndustry(opt ? { value: opt.value, label: opt.label } : null)}
                placeholder="Add industry…"
                selectProps={{ isDisabled: industryOpts.length >= MAX_TARGETED_INDUSTRIES }}
              />
              {industriesOverLimit && (
                <p className="text-xs text-red-600">Max {MAX_TARGETED_INDUSTRIES} industries allowed.</p>
              )}
              {industryOpts.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {industryOpts.map((i) => (
                    <span
                      key={i.value}
                      className="inline-flex items-center gap-1 rounded-full bg-[#E4F2DF] px-3 py-1 text-sm text-[#315326]"
                    >
                      {i.label}
                      <button type="button" onClick={() => removeIndustry(i.value)} className="hover:opacity-80">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <span className="flex items-center justify-between">
              <h2 className="font-semibold text-[#111]">
                Description <span className="text-red-500">*</span>
              </h2>
              <p className="text-xs text-gray-500">Min 100, max 15000 characters</p>
            </span>
            <Controller
              control={form.control}
              name="description"
              render={({ field }) => (
                <TipTap description={field.value || ""} onChange={field.onChange} />
              )}
            />
            {form.formState.errors.description?.message && (
              <p className="text-xs text-red-600">{String(form.formState.errors.description.message)}</p>
            )}
          </div>
        </div> 
    </div>
  );
}
