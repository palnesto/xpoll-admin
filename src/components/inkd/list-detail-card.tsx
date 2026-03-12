import { Pencil, ArrowUp, ArrowDown } from "lucide-react";
import { useNavigate } from "react-router"; 
import { InkdSignalItem } from "../types/inkd";

type Props = {
  item: InkdSignalItem;
};

export function SignalListCard({ item }: Props) {
  const navigate = useNavigate();

  return (
    <div className="rounded-[22px] border border-[#ececec] bg-[#f7f7f7] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
      <div
        className="relative cursor-pointer overflow-hidden rounded-[16px]"
        onClick={() =>
          navigate(`/inkd/list/${item.signalSlug}/detail/${item.id}`)
        }
      >
        <img
          src={item.image}
          alt={item.title}
          className="h-[110px] w-full object-cover"
        />

        <button
          type="button"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md"
        >
          <Pencil size={14} />
        </button>
      </div>

      <div
        className="cursor-pointer px-2 pt-4"
        onClick={() =>
          navigate(`/inkd/list/${item.signalSlug}/detail/${item.id}`)
        }
      >
        <h3 className="line-clamp-2 text-[18px] leading-[1.25] text-[#202020]">
          {item.title}
        </h3>
      </div>

      <div className="mt-4 rounded-[12px] bg-[#efefef] p-3">
        <div className="mb-2 text-xs font-semibold uppercase text-[#5f5f5f]">
          Rewards
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#444]">
          {item.rewards.map((reward) => (
            <div key={reward.label} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#8aa0b5]" />
              <span>{reward.amount}</span>
              <span className="text-[#7a7a7a]">{reward.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="rounded-full bg-[#efefef] px-5 py-2 text-sm text-[#6b6b6b]">
          {item.trailsCount} Trails
        </div>
        <div className="rounded-full bg-[#efefef] px-5 py-2 text-sm text-[#6b6b6b]">
          {item.publishedLabel}
        </div>
        <button className="flex flex-1 items-center justify-center rounded-full bg-[#6a5af9] py-2.5 text-white">
          <ArrowUp size={16} />
        </button>
        <button className="flex flex-1 items-center justify-center rounded-full bg-[#e3e3e3] py-2.5 text-[#555]">
          <ArrowDown size={16} />
        </button>
      </div>
    </div>
  );
}