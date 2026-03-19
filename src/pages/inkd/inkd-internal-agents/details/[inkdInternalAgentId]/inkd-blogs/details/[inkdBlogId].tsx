import { ArrowLeft, Pencil, Quote } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";
import { FullScreenLoader } from "@/components/full-screen-loader";
import { MarkdownPreview } from "@/components/markdown-preview";
import { assetSpecs } from "@/utils/currency-assets/asset";

type ResourceAsset = { type: string; value?: string };
type InkDTrial = {
  _id: string;
  title: string;
  description: string;
  resourceAssets?: ResourceAsset[];
  rewards?: { assetId: string; amount?: string; rewardAmountCap?: string }[];
};

function pickTrialImage(assets: ResourceAsset[] | undefined): string {
  const img = (assets ?? []).find((a) => a?.type === "image");
  return img?.value ? String(img.value) : "";
}

type BlogData = {
  _id: string;
  title: string;
  description: string;
  uploadedImageLinks: string[];
  uploadedVideoLinks: string[];
  ytVideoLinks: string[];
  externalLinks: string[];
  targetGeo: {
    countries: string[];
    states: string[];
    cities: string[];
  } | null;
  uniqueTargetLocations?: number;
  linkedIndustries: { _id: string; name: string; description: string | null }[];
  reviewVote?: "upvote" | "downvote" | null;
  totalActiveTrials?: number;
  inkDInternalAgentFallbackImage?: string | null;
  rewardsAlignment?: {
    activeTrialsOnly?: {
      assetId: string;
      rewardAmountCap: string;
      currentDistribution: string;
      rewardLeft: string;
    }[];
    nonActiveTrialsIncluded?: {
      assetId: string;
      rewardAmountCap: string;
      currentDistribution: string;
      rewardLeft: string;
    }[];
  };
};

export default function InkdBlogDetails() {
  const navigate = useNavigate();
  const { inkdInternalAgentId, inkdBlogId } = useParams<{
    inkdInternalAgentId: string;
    inkdBlogId: string;
  }>();

  const route = endpoints.entities.inkd.blogs.getById(inkdBlogId ?? "");
  const trialsRoute = endpoints.entities.inkd.blogs.getActiveTrails(
    inkdBlogId ?? "",
  );
  const { data, isLoading, isError } = useApiQuery(route, {
    queryKey: ["inkd-blog-details", inkdBlogId],
    enabled: !!inkdBlogId,
  });
  const blog = data?.data?.data as BlogData | undefined;
  const { data: trialsResp } = useApiQuery(trialsRoute, {
    queryKey: ["inkd-blog-trials", inkdBlogId],
    enabled: !!inkdBlogId,
  });
  const activeTrials = (trialsResp?.data?.data?.activeTrials ??
    trialsResp?.data?.activeTrials ??
    []) as InkDTrial[];

  if (isLoading || !blog) {
    return <FullScreenLoader />;
  }

  if (isError || !blog._id) {
    return (
      <div className="mx-auto w-full max-w-[1000px] px-4 py-12 text-center text-[#666]">
        Failed to load blog.
      </div>
    );
  }

  const locationLabels: string[] = [];
  if (blog.targetGeo) {
    if (blog.targetGeo.countries?.length)
      locationLabels.push(blog.targetGeo.countries.join(", "));
    if (blog.targetGeo.states?.length)
      locationLabels.push(blog.targetGeo.states.join(", "));
    if (blog.targetGeo.cities?.length)
      locationLabels.push(blog.targetGeo.cities.join(", "));
  }
  const firstIndustry = blog.linkedIndustries?.[0]?.name;

  // Hero media: 1) uploadedImageLinks, 2) uploadedVideoLinks, 3) ytVideoLinks, 4) static fallback
  const imageUrl = blog.uploadedImageLinks?.[0]?.trim();
  const videoUrl = blog.uploadedVideoLinks?.[0]?.trim();
  const ytId = blog.ytVideoLinks?.[0]?.trim();
  const fallbackImage =
    blog.inkDInternalAgentFallbackImage ??
    "https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=1600&q=80";

  const heroMedia =
    imageUrl ? { type: "image" as const, url: imageUrl } :
    videoUrl ? { type: "video" as const, url: videoUrl } :
    ytId ? { type: "youtube" as const, ytId } :
    { type: "image" as const, url: fallbackImage };

  const externalLinks = blog.externalLinks ?? [];

  return (
    <div className="w-full px-4 2xl:px-7 pb-12 pt-3">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex h-[34px] w-[50px] items-center justify-center rounded-full bg-[#ececec] text-[#2a2a2a] border-b-2 border-b-white"
        >
          <ArrowLeft size={16} />
        </button>

        {/* <div className="flex items-center gap-3">
          {locationLabels.length > 0 && (
            <div className="flex h-[32px] items-center rounded-full bg-[#ececec] px-4 text-[13px] text-[#666]">
              <MapPin size={12} className="mr-1.5 shrink-0" />
              {locationLabels.join(" · ")}
            </div>
          )}

          {firstIndustry && (
            <div className="flex h-[32px] items-center rounded-full bg-[#ececec] px-4 text-[13px] text-[#666]">
              <BriefcaseBusiness size={12} className="mr-1.5 shrink-0" />
              {firstIndustry}
            </div>
          )}

          {blog.totalActiveTrials != null && blog.totalActiveTrials > 0 && (
            <div className="flex h-[32px] items-center rounded-full bg-[#ececec] px-4 text-[13px] text-[#666]">
              {blog.totalActiveTrials} trial{blog.totalActiveTrials !== 1 ? "s" : ""}
            </div>
          )}
        </div> */}

        <button
          type="button"
          onClick={() =>
            inkdInternalAgentId &&
            inkdBlogId &&
            navigate(
              `/inkd/inkd-internal-agents/details/${inkdInternalAgentId}/inkd-blogs/edit/${inkdBlogId}`,
            )
          }
          className="flex h-[34px] items-center gap-2 rounded-full bg-[#727DD5] px-4 text-[15px] text-white hover:bg-[#5765c2] transition-all duration-300"
        >
          <Pencil size={13} />
          Edit Blog
        </button>
      </div>

      <div className="overflow-hidden rounded-[16px]">
        {heroMedia.type === "image" && (
          <img
            src={heroMedia.url}
            alt={blog.title}
            className="h-[335px] w-full rounded-[16px] object-cover"
          />
        )}
        {heroMedia.type === "video" && (
          <video
            src={heroMedia.url}
            controls
            playsInline
            className="h-[335px] w-full rounded-[16px] object-cover bg-black"
            aria-label={blog.title}
          />
        )}
        {heroMedia.type === "youtube" && (
          <div className="relative h-[335px] w-full rounded-[16px] overflow-hidden">
            <iframe
              title={blog.title}
              src={`https://www.youtube.com/embed/${heroMedia.ytId}?autoplay=0`}
              className="absolute inset-0 h-full w-full rounded-[16px]"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </div>

      <div className="flex items-start gap-4 mt-4">
        <div className="text-[64px] leading-none text-[#a7a7a7]">
          <Quote size={40} className="pt-2" />
        </div>
        <h1 className="text-[28px] font-normal uppercase text-[#1a1a1d]">
          {blog.title}
        </h1>
      </div>

      <MarkdownPreview content={blog.description} className="mt-6" />

      {/* Active trials as cards */}
      {activeTrials.length > 0 && (
        <div className="mt-12">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeTrials?.map((trial) => {
              const imgUrl = pickTrialImage(trial.resourceAssets);
              const coverImg =
                imgUrl ||
                "https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=1200&q=80";
              return (
                <button
                  key={trial._id}
                  type="button"
                  onClick={() => navigate(`/trials/${trial._id}`)}
                  className="overflow-hidden rounded-[18px] border border-[#ececef] bg-white p-[10px] text-left shadow-[0_1px_0_rgba(255,255,255,0.9)_inset] cursor-pointer hover:-translate-y-0.5 transition-all duration-300 hover:shadow-[0_4px_10px_rgba(0,0,0,0.1)]"
                >
                  <div className="relative h-[170px] w-full overflow-hidden rounded-[14px]">
                    <img
                      src={coverImg}
                      alt={trial.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="pt-3">
                    <div className="font-semibold leading-[1.25] text-[#151518] line-clamp-2">
                      {trial.title}
                    </div>
                    <p className="mt-2 line-clamp-2 text-[12px] leading-[1.35] text-[#7e7e86]">
                      {trial.description}
                    </p>
                    <div className="flex flex-col gap-x-3 gap-y-1 text-[10px] text-[#5f5f68] bg-[#F8F9FA] p-2 mt-2 rounded-lg">
                      <p className="text-[13px] font-semibold text-[#343434]">
                        🎁 Rewards
                      </p>
                      {(trial.rewards ?? []).slice(0, 3).map((r) => (
                        <span
                          key={r.assetId}
                          className="bg-[#F2F3F5] w-fit rounded-sm px-2 py-1 flex items-center gap-2"
                        >
                          <img
                            src={assetSpecs[r.assetId]?.img}
                            alt={r.assetId}
                            className="w-4 h-4"
                          />{" "}
                          <span className="text-black">{r.amount ?? "0"}</span>{" "}
                          {r.assetId}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sources */}
      {externalLinks.length > 0 && (
        <div className="mt-12">
          <h3 className="text-2xl font-medium text-[#202024]">Sources</h3>
          <ul className="mt-3 flex list-inside list-decimal flex-wrap gap-x-4 gap-y-1 text-[14px] text-[#8a8a91]">
            {externalLinks.map((href, index) => {
              const url = href.startsWith("http") ? href : `https://${href}`;
              const label =
                href.replace(/^https?:\/\//i, "").replace(/\/$/, "") || url;
              return (
                <li key={`${href}-${index}`}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="transition hover:underline"
                  >
                    {label}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
