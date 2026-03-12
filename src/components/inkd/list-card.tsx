import { useNavigate } from "react-router"; 
import { InkdSignal } from "../types/inkd";

type Props = {
  signal: InkdSignal;
};

export function SignalCard({ signal }: Props) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(`/inkd/list/${signal.slug}`)}
      className="rounded-[24px] bg-[#e8ebf2] p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[32px] leading-none text-black">{signal.title}</h3>
        <span className="rounded-full bg-[#e3f6e7] px-3 py-1 text-xs text-[#3b9b56]">
          {signal.status}
        </span>
      </div>

      <div className="rounded-[18px] bg-white/70 p-4">
        <div className="text-[10px] uppercase tracking-[0.15em] text-neutral-400">
          Output
        </div>
        <div className="mt-1 text-4xl text-black">{signal.blogsGenerated}</div>
        <div className="mt-1 text-sm text-neutral-500">Blogs Generated</div>
      </div>

      <div className="mt-4 flex gap-2">
        <div className="flex-1 rounded-full bg-white/65 px-4 py-2 text-center text-xs text-neutral-500">
          {signal.locationCount} Location added
        </div>
        <div className="flex-1 rounded-full bg-white/65 px-4 py-2 text-center text-xs text-neutral-500">
          {signal.category}
        </div>
      </div>

      <div className="mt-4 w-full rounded-full bg-[#5b4df7] px-4 py-3 text-center text-sm text-white">
        Next post · {signal.nextPostTime}
      </div>
    </button>
  );
}