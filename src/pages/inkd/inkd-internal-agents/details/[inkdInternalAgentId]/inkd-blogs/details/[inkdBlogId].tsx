import {
  ArrowLeft,
  MapPin,
  BriefcaseBusiness,
  Pencil,
  ExternalLink,
  ChevronRight,
  NotebookPen,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";
import { FullScreenLoader } from "@/components/full-screen-loader";

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
    activeTrialsOnly?: { assetId: string; rewardAmountCap: string; currentDistribution: string; rewardLeft: string }[];
    nonActiveTrialsIncluded?: { assetId: string; rewardAmountCap: string; currentDistribution: string; rewardLeft: string }[];
  };
};

export default function InkdBlogDetails() {
  const navigate = useNavigate();
  const { inkdInternalAgentId, inkdBlogId } = useParams<{
    inkdInternalAgentId: string;
    inkdBlogId: string;
  }>();

  const route = endpoints.entities.inkd.blogs.getById(inkdBlogId ?? "");
  const trialsRoute = endpoints.entities.inkd.blogs.getActiveTrails(inkdBlogId ?? "");
  const { data, isLoading, isError } = useApiQuery(route, {
    queryKey: ["inkd-blog-details", inkdBlogId],
    enabled: !!inkdBlogId,
  });
  const blog = data?.data?.data as BlogData | undefined;
  const { data: trialsResp } = useApiQuery(trialsRoute, {
    queryKey: ["inkd-blog-trials", inkdBlogId],
    enabled: !!inkdBlogId,
  });
  const activeTrials = (trialsResp?.data?.data?.activeTrials ?? trialsResp?.data?.activeTrials ?? []) as InkDTrial[];

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
    if (blog.targetGeo.countries?.length) locationLabels.push(blog.targetGeo.countries.join(", "));
    if (blog.targetGeo.states?.length) locationLabels.push(blog.targetGeo.states.join(", "));
    if (blog.targetGeo.cities?.length) locationLabels.push(blog.targetGeo.cities.join(", "));
  }
  const firstIndustry = blog.linkedIndustries?.[0]?.name;
  const heroImage =
    blog.uploadedImageLinks?.[0] ??
    blog.inkDInternalAgentFallbackImage ??
    "https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=1600&q=80";

  const externalLinks = blog.externalLinks ?? [];

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 pb-12 pt-3">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex h-[34px] w-[42px] items-center justify-center rounded-full bg-[#ececec] text-[#2a2a2a]"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="flex items-center gap-3">
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
        </div>

        <button
          type="button"
          onClick={() =>
            inkdInternalAgentId &&
            inkdBlogId &&
            navigate(
              `/inkd/inkd-internal-agents/details/${inkdInternalAgentId}/inkd-blogs/edit/${inkdBlogId}`
            )
          }
          className="flex h-[34px] items-center gap-2 rounded-full bg-[#7078e6] px-4 text-[13px] text-white"
        >
          <Pencil size={13} />
          Edit Blog
        </button>
      </div>

      <div className="overflow-hidden rounded-[16px]">
        <img
          src={heroImage}
          alt={blog.title}
          className="h-[335px] w-full rounded-[16px] object-cover"
        />
      </div>

      <div className="mt-5 space-y-2 text-[15px] leading-[1.9] text-[#2d2d30]">
        <p>{blog.description}</p>
      </div>

      <div className="mt-12 flex items-start gap-4">
        <div className="pt-2 text-[64px] leading-none text-[#a7a7a7]">"</div>
        <h1 className="text-[28px] font-normal uppercase tracking-[-0.03em] text-[#1a1a1d]">
          {blog.title}
        </h1>
      </div>

      {/* Rewards alignment if present */}
      {blog.rewardsAlignment?.activeTrialsOnly?.length ? (
        <div className="mt-8">
          <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#4a4a4f]">
            Rewards (active trials)
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-[#5f5f68]">
            {blog.rewardsAlignment.activeTrialsOnly.map((r) => (
              <span key={r.assetId}>
                {r.assetId} cap {r.rewardAmountCap}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Active trials as cards */}
      {activeTrials.length > 0 && (
        <div className="mt-12">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {activeTrials.map((trial) => {
              const imgUrl = pickTrialImage(trial.resourceAssets);
              const coverImg = imgUrl || "https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=1200&q=80";
              return (
                <button
                  key={trial._id}
                  type="button"
                  className="overflow-hidden rounded-[18px] border border-[#ececef] bg-[#f8f8f8] p-[10px] text-left shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]"
                >
                  <div className="relative h-[130px] w-full overflow-hidden rounded-[14px]">
                    <img
                      src={coverImg}
                      alt={trial.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="pt-3">
                    <div className="text-[14px] font-semibold leading-[1.25] text-[#151518]">
                      {trial.title}
                    </div>
                    <p className="mt-2 line-clamp-2 text-[12px] leading-[1.35] text-[#7e7e86]">
                      {trial.description}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#5f5f68]">
                        {(trial.rewards ?? []).slice(0, 3).map((r) => (
                          <span key={r.assetId}>
                            {r.amount ?? "0"} {r.assetId}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/trials/${trial._id}`, {
                              state: { isNavigationEditing: true },
                            });
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ececec] text-[#666] hover:bg-[#e0e0e0]"
                          aria-label="Edit trial"
                        >
                          <NotebookPen size={14} />
                        </button>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#ececec] text-[#666]">
                          <ChevronRight size={14} />
                        </span>
                      </div>
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
          <h3 className="text-[16px] font-medium text-[#202024]">Sources</h3>
          <div className="mt-3 flex flex-wrap gap-3">
            {externalLinks.map((href, index) => {
              const url = href.startsWith("http") ? href : `https://${href}`;
              const label = href.replace(/^https?:\/\//i, "").replace(/\/$/, "") || url;
              return (
                <a
                  key={`${href}-${index}`}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-[30px] items-center gap-2 rounded-full bg-[#ececec] px-4 text-[14px] text-[#8a8a91] transition hover:bg-[#e4e4e7]"
                >
                  {label}
                  <ExternalLink size={13} />
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
