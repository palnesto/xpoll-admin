import { useMemo, useState } from "react";
import {
  Search,
  LayoutGrid,
  List,
  NotebookPen,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { endpoints } from "@/api/endpoints";
import ListingPagination from "@/components/commons/listing-pagination";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { assetSpecs, type AssetType } from "@/utils/currency-assets/asset";
import inkPlaceholder from "@/assets/fallback.png";
import inkd from "@/assets/ink.png";

const BASE_URL = endpoints.entities.inkd.blogs.advancedListings;
const PAGE_SIZE = 20;

type RewardLeg = {
  assetId: string;
  rewardAmountCap: string;
  currentDistribution: string;
  rewardLeft: string;
};

type BlogEntry = {
  _id: string;
  title: string;
  description: string;
  uploadedImageLinks: string[];
  uploadedVideoLinks: string[];
  ytVideoLinks: string[];
  inkDInternalAgentFallbackImage?: string | null;
  reviewVote: "upvote" | "downvote" | null;
  totalActiveTrials: number;
  createdAt: string;
  archivedAt: string | null;
  rewardsAlignment?: {
    activeTrialsOnly?: RewardLeg[];
    nonActiveTrialsIncluded?: RewardLeg[];
  };
};

type ViewMode = "cards" | "rows";

function convertReward(assetId: string, baseValue: string): string {
  const spec = assetSpecs[assetId as AssetType];
  if (!spec) return baseValue;
  return unwrapString(
    amount({
      op: "toParent",
      assetId: assetId as AssetType,
      value: baseValue,
      output: "string",
      trim: true,
      group: true,
    }),
  );
}

function RewardChips({ legs }: { legs: RewardLeg[] }) {
  if (!legs.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-[14px] gap-y-[6px] text-[11px] text-[#6b6b74]">
      {legs.map((leg) => {
        const spec = assetSpecs[leg.assetId as AssetType];
        const converted = convertReward(leg.assetId, leg.rewardAmountCap);
        return (
          <span key={leg.assetId} className="inline-flex items-center gap-1.5">
            {spec?.img ? (
              <img
                src={spec.img}
                alt={spec.parentSymbol}
                className="h-3.5 w-3.5 rounded-full object-contain"
              />
            ) : null}
            {converted} {spec?.parentSymbol ?? leg.assetId}
          </span>
        );
      })}
    </div>
  );
}

function getBlogMedia(blog: BlogEntry): string {
  if (blog.uploadedImageLinks?.length) return blog.uploadedImageLinks[0];
  if (blog.uploadedVideoLinks?.length) return blog.uploadedVideoLinks[0];
  if (blog.ytVideoLinks?.length) return blog.ytVideoLinks[0];
  if (blog.inkDInternalAgentFallbackImage)
    return blog.inkDInternalAgentFallbackImage;
  return inkPlaceholder;
}

export default function InkdInternalAgentDetailsPage() {
  const navigate = useNavigate();
  const { inkdInternalAgentId } = useParams();
  const [view, setView] = useState<ViewMode>("cards");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const listQueryKey = useMemo(
    () => ["inkd-blogs-advanced", inkdInternalAgentId, page, query],
    [inkdInternalAgentId, page, query],
  );

  const urlWithQuery = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (inkdInternalAgentId) {
      params.set("createdByInkdInternalAgentId", inkdInternalAgentId);
    }
    const q = query.trim();
    if (q) params.set("q", q);
    return `${BASE_URL}?${params.toString()}`;
  }, [page, inkdInternalAgentId, query]);

  const { data, isLoading } = useApiQuery(urlWithQuery, {
    queryKey: listQueryKey,
    enabled: !!inkdInternalAgentId,
  } as any);

  const payload = data?.data?.data ?? {};
  const entries: BlogEntry[] = Array.isArray(payload.entries)
    ? payload.entries
    : [];
  const meta = payload.meta ?? {};
  const totalPages =
    typeof meta.totalPages === "number" && meta.totalPages > 0
      ? meta.totalPages
      : Math.max(1, Math.ceil((meta.total || 1) / PAGE_SIZE));
  const currentPage =
    typeof meta.page === "number" && meta.page > 0 ? meta.page : page;

  const goToBlog = (blogId: string) => {
    navigate(
      `/inkd/inkd-internal-agents/details/${inkdInternalAgentId}/inkd-blogs/details/${blogId}`,
    );
  };

  const getRewardLegs = (blog: BlogEntry): RewardLeg[] =>
    blog.rewardsAlignment?.activeTrialsOnly ??
    blog.rewardsAlignment?.nonActiveTrialsIncluded ??
    [];

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86_400_000) return "Today";
    if (diff < 172_800_000) return "Yesterday";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1000px] 2xl:px-4 pb-8 pt-3">
      {/* Top controls */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="relative w-full max-w-[545px]">
          <div className="flex h-[54px] items-center rounded-[28px] bg-white px-4 shadow-[0_1px_0_rgba(255,255,255,0.75)_inset]">
            <img src={inkd} alt="search" className="mr-3 h-5 text-[#6C63E5]" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search the chart"
              className="h-full flex-1 bg-transparent text-[14px] font-normal text-[#353535] outline-none placeholder:text-[#b8b8c2]"
            />
            <div className="flex h-[34px] w-[58px] items-center justify-center rounded-full bg-[#efefef]">
              <Search size={13} className="text-[#d0d0d0]" />
            </div>
          </div>
        </div>

        <div className="flex h-[48px] items-center rounded-full bg-[#eef0f2] p-[4px] shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]">
          <button
            type="button"
            onClick={() => setView("cards")}
            className={`flex h-[40px] w-[52px] items-center justify-center rounded-full transition ${
              view === "cards"
                ? "bg-white text-[#6b63f6] shadow-[0_2px_10px_rgba(0,0,0,0.05)]"
                : "text-[#8f8f98]"
            }`}
          >
            <LayoutGrid size={17} strokeWidth={2} />
          </button>

          <button
            type="button"
            onClick={() => setView("rows")}
            className={`flex h-[40px] w-[52px] items-center justify-center rounded-full transition ${
              view === "rows"
                ? "bg-white text-[#6b63f6] shadow-[0_2px_10px_rgba(0,0,0,0.05)]"
                : "text-[#8f8f98]"
            }`}
          >
            <List size={17} strokeWidth={2} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="py-20 text-center text-neutral-400">Loading blogs…</p>
      ) : entries.length === 0 ? (
        <p className="py-20 text-center text-neutral-400">
          No blogs found for this agent.
        </p>
      ) : view === "cards" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {entries.map((blog) => {
            const media = getBlogMedia(blog);
            const legs = getRewardLegs(blog);
            return (
              <div
                key={blog._id}
                className="overflow-hidden rounded-[22px] bg-[#f8f8f8] p-[8px] text-left shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]"
              >
                <div className="overflow-hidden rounded-[18px]">
                  <div className="relative h-[142px] w-full overflow-hidden rounded-[18px]">
                    <img
                      src={media}
                      alt={blog.title}
                      className="h-full w-full object-cover"
                    />

                    <button
                      type="button"
                      onClick={() => goToBlog(blog._id)}
                      className="absolute right-[8px] top-[8px] flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[rgba(42,42,42,0.55)] text-white backdrop-blur-md"
                    >
                      <NotebookPen size={14} />
                    </button>
                  </div>
                </div>

                <div className="px-[8px] pb-[4px] pt-[12px]">
                  <h3 className="line-clamp-2 min-h-[58px] text-[16px] font-normal leading-[1.35] tracking-[-0.02em] text-[#1b1b1d]">
                    {blog.title}
                  </h3>

                  {legs.length > 0 && (
                    <div className="mt-[12px] rounded-[12px] bg-[#f1f1f1] px-[10px] py-[9px]">
                      <div className="mb-[6px] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#575757]">
                        Rewards
                      </div>
                      <RewardChips legs={legs} />
                    </div>
                  )}

                  <div className="mt-[12px] flex items-center gap-[8px]">
                    <div className="flex h-[28px] min-w-[72px] items-center justify-center rounded-full bg-[#eeeeef] px-3 text-[12px] text-[#75757e]">
                      {blog.totalActiveTrials ?? 0} Trails
                    </div>

                    <div className="flex h-[28px] min-w-[72px] items-center justify-center rounded-full bg-[#eeeeef] px-3 text-[12px] text-[#75757e]">
                      {formatDate(blog.createdAt)}
                    </div>

                    <VotePills
                      blogId={blog._id}
                      reviewVote={blog.reviewVote}
                      listQueryKey={listQueryKey}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[18px] bg-[#f8f8f8] shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]">
          <div className="grid grid-cols-[140px_minmax(0,1fr)_180px_120px_44px] items-center gap-0 border-b border-[#ededed] px-6 py-4">
            <div className="text-[14px] font-medium text-[#1e1e22]">Image</div>
            <div className="text-[14px] font-medium text-[#1e1e22]">
              Blog name
            </div>
            <div className="text-[14px] font-medium text-[#1e1e22]">
              Rewards
            </div>
            <div className="text-[14px] font-medium text-[#1e1e22]">Vote</div>
            <div />
          </div>

          {entries.map((blog, index) => {
            const media = getBlogMedia(blog);
            const legs = getRewardLegs(blog);
            return (
              <div
                key={blog._id}
                className={`grid w-full grid-cols-[140px_minmax(0,1fr)_180px_120px_44px] items-center gap-0 px-6 py-4 text-left transition hover:bg-[#f2f2f3] ${
                  index !== entries.length - 1
                    ? "border-b border-[#ededed]"
                    : ""
                }`}
              >
                <div>
                  <img
                    src={media}
                    alt={blog.title}
                    className="h-[52px] w-[96px] rounded-[12px] object-cover"
                  />
                </div>

                <div className="pr-6">
                  <div className="max-w-[360px] text-[14px] font-normal leading-[1.3] text-[#232327]">
                    {blog.title}
                  </div>
                </div>

                <div className="pr-4">
                  {legs.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      {legs.slice(0, 2).map((leg) => {
                        const spec = assetSpecs[leg.assetId as AssetType];
                        const converted = convertReward(
                          leg.assetId,
                          leg.rewardAmountCap,
                        );
                        return (
                          <span
                            key={leg.assetId}
                            className="inline-flex items-center gap-1 text-[12px] text-[#6b6b74]"
                          >
                            {spec?.img && (
                              <img
                                src={spec.img}
                                alt={spec.parentSymbol}
                                className="h-3 w-3 rounded-full object-contain"
                              />
                            )}
                            {converted} {spec?.parentSymbol ?? leg.assetId}
                          </span>
                        );
                      })}
                      {legs.length > 2 && (
                        <span className="text-[11px] text-[#999]">
                          +{legs.length - 2} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[12px] text-[#999]">—</span>
                  )}
                </div>

                <div>
                  <VotePills
                    blogId={blog._id}
                    reviewVote={blog.reviewVote}
                    listQueryKey={listQueryKey}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => goToBlog(blog._id)}
                  className="flex justify-end text-[#4d4d55] hover:text-[#2a2a2f]"
                >
                  <NotebookPen size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <ListingPagination
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
          variant="primary"
          className="sticky bottom-0 left-0 mt-10 flex w-fit mx-auto justify-center rounded-2xl bg-background py-4 shadow-md"
        />
      )}
    </div>
  );
}

function VotePills({
  blogId,
  reviewVote,
  listQueryKey,
}: {
  blogId: string;
  reviewVote: "upvote" | "downvote" | null;
  listQueryKey: (string | number | undefined)[];
}) {
  const queryClient = useQueryClient();

  const { mutate: castVote, isPending } = useApiMutation<
    { reviewVote: "upvote" | "downvote" | null },
    unknown
  >({
    route: endpoints.entities.inkd.blogs.reviewVote(blogId),
    method: "PATCH",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listQueryKey });
    },
  });

  const handleVote = (
    e: React.MouseEvent,
    vote: "upvote" | "downvote",
  ) => {
    e.stopPropagation();
    if (isPending) return;
    castVote({ reviewVote: reviewVote === vote ? null : vote });
  };

  return (
    <div className="ml-auto flex items-center gap-[8px]">
      <button
        type="button"
        disabled={isPending}
        onClick={(e) => handleVote(e, "upvote")}
        className={`flex h-[28px] w-[58px] items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-70 ${
          reviewVote === "upvote"
            ? "bg-[#7078e6] text-white"
            : "bg-[#dedede] text-[#555]"
        }`}
      >
        <ArrowUp size={13} strokeWidth={2.5} />
      </button>

      <button
        type="button"
        disabled={isPending}
        onClick={(e) => handleVote(e, "downvote")}
        className={`flex h-[28px] w-[58px] items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-70 ${
          reviewVote === "downvote"
            ? "bg-[#ff5a36] text-white"
            : "bg-[#dedede] text-[#555]"
        }`}
      >
        <ArrowDown size={13} strokeWidth={2.5} />
      </button>
    </div>
  );
}
