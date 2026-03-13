import {
  ArrowLeft,
  MapPin,
  BriefcaseBusiness,
  BadgeAlert,
  Pencil,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

type RelatedCard = {
  id: string;
  title: string;
  description: string;
  image: string;
};

const RELATED_CARDS: RelatedCard[] = [
  {
    id: "source-1",
    title: "Coastline, Climate & Infrastructure",
    description:
      "Storms, flooding, aging roads and bridges — Rhode Island's infrastructure and shoreline are under pressure...",
    image:
      "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "source-2",
    title: "Coastline, Climate & Infrastructure",
    description:
      "Storms, flooding, aging roads and bridges — Rhode Island's infrastructure and shoreline are under pressure...",
    image:
      "https://images.unsplash.com/photo-1581090700227-1e8b6d1d7c7b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "source-3",
    title: "Coastline, Climate & Infrastructure",
    description:
      "Storms, flooding, aging roads and bridges — Rhode Island's infrastructure and shoreline are under pressure...",
    image:
      "https://images.unsplash.com/photo-1518391846015-55a9cc003b25?auto=format&fit=crop&w=1200&q=80",
  },
];

const SOURCE_LINKS = ["www.xyz.com", "www.xyz.com"];

export default function InkdBlogDetails() {
  const navigate = useNavigate(); 

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
            <div className="flex h-[32px] items-center rounded-full bg-[#ececec] px-4 text-[13px] text-[#666]">
              <MapPin size={12} className="mr-1.5" />
              Rhode Island
            </div>

            <div className="flex h-[32px] items-center rounded-full bg-[#ececec] px-4 text-[13px] text-[#666]">
              <BriefcaseBusiness size={12} className="mr-1.5" />
              Finance
            </div>

            <div className="flex h-[32px] items-center rounded-full bg-[#ececec] px-4 text-[13px] text-[#666]">
              <BadgeAlert size={12} className="mr-1.5" />
              Tactical Tone
            </div>
          </div>

          <button className="flex h-[34px] items-center gap-2 rounded-full bg-[#7078e6] px-4 text-[13px] text-white">
            <Pencil size={13} />
            Edit Blog
          </button>
        </div>

        <div className="overflow-hidden rounded-[16px]">
          <img
            src="https://images.unsplash.com/photo-1444723121867-7a241cacace9?auto=format&fit=crop&w=1600&q=80"
            alt="blog"
            className="h-[335px] w-full rounded-[16px] object-cover"
          />
        </div>

        <div className="mt-5 space-y-2 text-[15px] leading-[1.9] text-[#2d2d30]">
          <p>
            Rhode Island is small, coastal, and close to major Northeast job hubs
            — but it also carries Northeast-level housing costs and a job market
            that’s strong in a few key sectors (especially healthcare and
            education) while other sectors can be more cyclical.
          </p>
          <p>The cost of living story in one line</p>
          <p>
            For most households, housing is the make-or-break expense, and that’s
            where Rhode Island feels expensive compared to many states.
          </p>
        </div>

        <div className="mt-12 flex items-start gap-4">
          <div className="pt-2 text-[64px] leading-none text-[#a7a7a7]">”</div>
          <h1 className="text-[28px] font-normal uppercase tracking-[-0.03em] text-[#1a1a1d]">
            Cost of Living & Jobs in Rhode Island
          </h1>
        </div>

        <div className="mt-6 space-y-6 text-[15px] leading-[1.95] text-[#2d2d30]">
          <p>
            Foam padding in the insoles leather finest quality staple flat slip-on
            design pointed toe off-duty shoe. Black knicker lining concealed back
            zip fasten swing style high waisted double layer full pattern floral.
            Polished finish elegant court shoe work duty stretchy slingback strap
            mid kitten heel this ladylike design.
          </p>

          <p>
            Eget aenean tellus venenatis. Donec odio tempus. Felis arcu pretium
            metus nullam quam aenean sociis quis sem neque vici libero. Venenatis
            nullam fringilla pretium magnis aliquam nunc vulputate integer augue
            ultricies cras. Eget viverra feugiat cras ut.
          </p>
        </div>

        {/* bottom cards */}
        <div className="mt-12">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {RELATED_CARDS.map((card) => (
              <button
                key={card.id}
                type="button"
                className="overflow-hidden rounded-[18px] border border-[#ececef] bg-[#f8f8f8] p-[10px] text-left shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]"
              >
                <div className="relative h-[130px] w-full overflow-hidden rounded-[14px]">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="h-full w-full object-cover"
                  /> 
                </div>

                <div className="pt-3">
                  <div className="text-[14px] font-semibold leading-[1.25] text-[#151518]">
                    {card.title}
                  </div>

                  <p className="mt-2 text-[12px] leading-[1.35] text-[#7e7e86]">
                    {card.description}
                  </p>

                  <div className="mt-5">
                    <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#4a4a4f]">
                      Rewards
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-[#5f5f68]">
                      <span>🔵 0.224 XSUI</span>
                      <span>⬣ 0.224 XXRP</span>
                      <span>✕ 0.224 XSUI</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* sources */}
          <div className="mt-8">
            <h3 className="text-[16px] font-medium text-[#202024]">Sources</h3>

            <div className="mt-3 flex flex-wrap gap-3">
              {SOURCE_LINKS.map((source, index) => (
                <a
                  key={`${source}-${index}`}
                  href={`https://${source}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-[30px] items-center gap-2 rounded-full bg-[#ececec] px-4 text-[14px] text-[#8a8a91] transition hover:bg-[#e4e4e7]"
                >
                  {source}
                  <ExternalLink size={13} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div> 
  );
}