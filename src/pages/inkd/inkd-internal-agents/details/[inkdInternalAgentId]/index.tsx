import { useMemo, useState } from "react";
import {
  Search,
  LayoutGrid,
  List,
  Pencil,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

type BlogItem = {
  id: string;
  title: string;
  image: string;
  trails: number;
  upActive?: boolean;
  downActive?: boolean;
};

const BLOGS: BlogItem[] = [
  {
    id: "blog-1",
    title: "Providence Zoning Bill: What Developers Need to Know",
    image:
      "https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=1200&q=80",
    trails: 3,
    downActive: true,
  },
  {
    id: "blog-2",
    title: "Providence Zoning Bill: What Developers Need to Know",
    image:
      "https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=1200&q=80",
    trails: 3,
    upActive: true,
  },
  {
    id: "blog-3",
    title: "Providence Zoning Bill: What Developers Need to Know",
    image:
      "https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=1200&q=80",
    trails: 3,
    downActive: true,
  },
  {
    id: "blog-4",
    title: "Providence Zoning Bill: What Developers Need to Know",
    image:
      "https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=1200&q=80",
    trails: 3,
    upActive: true,
  },
  {
    id: "blog-5",
    title: "Energy Prices and Rhode Island: Local Impact of a Global Oil Surge",
    image:
      "https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=1200&q=80",
    trails: 12,
    downActive: true,
  },
  {
    id: "blog-6",
    title: "Port & Maritime Exposure",
    image:
      "https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=1200&q=80",
    trails: 154,
    upActive: true,
  },
];

type ViewMode = "cards" | "rows";

export default function InkdInternalAgentDetailsPage() {
  const navigate = useNavigate();
  const { inkdInternalAgentId } = useParams();
  const [view, setView] = useState<ViewMode>("cards");
  const [query, setQuery] = useState("");

  const filteredBlogs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BLOGS;
    return BLOGS.filter((blog) => blog.title.toLowerCase().includes(q));
  }, [query]);

  const goToBlog = (blogId: string) => {
    navigate(
      `/inkd/inkd-internal-agents/details/${inkdInternalAgentId}/inkd-blogs/details/${blogId}`,
    );
  };

  return ( 
      <div className="mx-auto w-full max-w-[1000px] px-4 pb-8 pt-3">
        {/* Top controls */}
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="relative w-full max-w-[545px]">
            <div className="flex h-[54px] items-center rounded-[28px] bg-white px-4 shadow-[0_1px_0_rgba(255,255,255,0.75)_inset]">
              <Search size={15} className="mr-3 text-[#b8b8c2]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
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

        {/* Conditional rendering: only one view at a time */}
        {view === "cards" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredBlogs.map((blog) => (
              <button
                key={blog.id}
                type="button"
                onClick={() => goToBlog(blog.id)}
                className="overflow-hidden rounded-[22px] bg-[#f8f8f8] p-[8px] text-left shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]"
              >
                <div className="overflow-hidden rounded-[18px]">
                  <div className="relative h-[142px] w-full overflow-hidden rounded-[18px]">
                    <img
                      src={blog.image}
                      alt={blog.title}
                      className="h-full w-full object-cover"
                    />

                    <div className="absolute right-[8px] top-[8px] flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[rgba(42,42,42,0.55)] text-white backdrop-blur-md">
                      <Pencil size={14} />
                    </div>
                  </div>
                </div>

                <div className="px-[8px] pb-[4px] pt-[12px]">
                  <h3 className="line-clamp-2 min-h-[58px] text-[16px] font-normal leading-[1.35] tracking-[-0.02em] text-[#1b1b1d]">
                    {blog.title}
                  </h3>

                  <div className="mt-[12px] rounded-[12px] bg-[#f1f1f1] px-[10px] py-[9px]">
                    <div className="mb-[6px] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#575757]">
                      🎁 Rewards
                    </div>

                    <div className="flex flex-wrap items-center gap-x-[14px] gap-y-[6px] text-[11px] text-[#6b6b74]">
                      <span>Ⓧ 0.224 XPOLL</span>
                      <span>🟦 0.224 XSUI</span>
                      <span>⬣ 0.224 XXRP</span>
                      <span>✕ 0.224 XAptos</span>
                    </div>
                  </div>

                  <div className="mt-[12px] flex items-center gap-[8px]">
                    <div className="flex h-[28px] min-w-[72px] items-center justify-center rounded-full bg-[#eeeeef] px-3 text-[12px] text-[#75757e]">
                      {blog.trails} Trails
                    </div>

                    <div className="flex h-[28px] min-w-[72px] items-center justify-center rounded-full bg-[#eeeeef] px-3 text-[12px] text-[#75757e]">
                      Today
                    </div>

                    <VotePills
                      upActive={blog.upActive}
                      downActive={blog.downActive}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-[18px] bg-[#f8f8f8] shadow-[0_1px_0_rgba(255,255,255,0.8)_inset]">
            <div className="grid grid-cols-[140px_minmax(0,1fr)_140px_160px_44px] items-center gap-0 border-b border-[#ededed] px-6 py-4">
              <div className="text-[14px] font-medium text-[#1e1e22]">Image</div>
              <div className="text-[14px] font-medium text-[#1e1e22]">
                Blog name
              </div>
              <div className="text-[14px] font-medium text-[#1e1e22]">
                No. of Trails
              </div>
              <div className="text-[14px] font-medium text-[#1e1e22]">Vote</div>
              <div />
            </div>

            {filteredBlogs.map((blog, index) => (
              <button
                key={blog.id}
                type="button"
                onClick={() => goToBlog(blog.id)}
                className={`grid w-full grid-cols-[140px_minmax(0,1fr)_140px_160px_44px] items-center gap-0 px-6 py-4 text-left transition hover:bg-[#f2f2f3] ${
                  index !== filteredBlogs.length - 1 ? "border-b border-[#ededed]" : ""
                }`}
              >
                <div>
                  <img
                    src={blog.image}
                    alt={blog.title}
                    className="h-[52px] w-[96px] rounded-[12px] object-cover"
                  />
                </div>

                <div className="pr-6">
                  <div className="max-w-[360px] text-[14px] font-normal leading-[1.3] text-[#232327]">
                    {blog.title}
                  </div>
                </div>

                <div className="text-[14px] text-[#2a2a2f]">{blog.trails}</div>

                <div>
                  <VotePills
                    upActive={blog.upActive}
                    downActive={blog.downActive}
                  />
                </div>

                <div className="flex justify-end text-[#4d4d55]">
                  <Pencil size={15} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div> 
  );
}

function VotePills({
  upActive,
  downActive,
}: {
  upActive?: boolean;
  downActive?: boolean;
}) {
  return (
    <div className="ml-auto flex items-center gap-[8px]">
      <div
        className={`flex h-[28px] w-[58px] items-center justify-center rounded-full ${
          upActive ? "bg-[#7078e6] text-white" : "bg-[#dedede] text-[#555]"
        }`}
      >
        <ArrowUp size={13} strokeWidth={2.5} />
      </div>

      <div
        className={`flex h-[28px] w-[58px] items-center justify-center rounded-full ${
          downActive ? "bg-[#ff5a36] text-white" : "bg-[#dedede] text-[#555]"
        }`}
      >
        <ArrowDown size={13} strokeWidth={2.5} />
      </div>
    </div>
  );
}