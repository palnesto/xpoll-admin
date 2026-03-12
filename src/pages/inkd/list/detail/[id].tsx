import { inkdSignalItems } from "@/utils/mock-inkd";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router"; 

export default function SignalDetailPage() {
  const navigate = useNavigate();
  const { signalSlug, itemId } = useParams();

  const item = useMemo(
    () =>
      inkdSignalItems.find(
        (entry) => entry.signalSlug === signalSlug && entry.id === itemId
      ),
    [signalSlug, itemId]
  );

  if (!item) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f4f4]">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          Item not found
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4] p-6">
      <div className="mx-auto max-w-5xl rounded-[28px] bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate(`/inkd/list/${signalSlug}`)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f1f1] text-black"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-2xl font-medium text-[#202020]">{item.title}</h1>
        </div>

        <img
          src={item.image}
          alt={item.title}
          className="mb-6 h-[320px] w-full rounded-[20px] object-cover"
        />

        <div className="rounded-[18px] bg-[#f7f7f7] p-5">
          <div className="mb-3 text-sm font-semibold uppercase text-[#666]">
            Rewards
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-[#444]">
            {item.rewards.map((reward) => (
              <div key={reward.label} className="rounded-full bg-white px-4 py-2">
                {reward.amount} {reward.label}
              </div>
            ))}
          </div>

          <div className="mt-6 text-[#666]">
            This is the detail page for the selected list item. Later you can
            replace this entire block with API-driven content, editor state,
            activity logs, publishing controls, generated drafts, and audit trail.
          </div>
        </div>
      </div>
    </div>
  );
}