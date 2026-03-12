import { SignalListCard } from "@/components/inkd/list-detail-card";
import { inkdSignalItems, inkdSignals } from "@/utils/mock-inkd";
import { ArrowLeft, LayoutGrid, List, Search, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router"; 

export default function SignalListPage() {
  const navigate = useNavigate();
  const { signalSlug } = useParams();

  const signal = useMemo(
    () => inkdSignals.find((item) => item.slug === signalSlug),
    [signalSlug]
  );

  const items = useMemo(
    () => inkdSignalItems.filter((item) => item.signalSlug === signalSlug),
    [signalSlug]
  );

  if (!signal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f4f4]">
        <div className="rounded-2xl bg-white p-8 shadow-sm">
          Signal not found
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4] p-1">
      <div className="grid min-h-screen grid-cols-[460px_1fr] overflow-hidden rounded-[28px] bg-[#f4f4f4]">
        {/* left panel */}
        <aside className="flex flex-col border-r border-[#e5e5f2] bg-[#f8f8f8]">
          <div className="p-2">
            <div className="flex items-center justify-between rounded-[22px] bg-[#eceff4] px-4 py-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate("/inkd")}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f4f4f4] text-black"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4a6cf7] text-xs font-semibold text-white">
                  T
                </div>

                <h1 className="text-[22px] font-medium text-[#202020]">
                  {signal.title}
                </h1>
              </div>

              <button className="rounded-full bg-[#6257f6] px-6 py-3 text-sm text-white">
                Configure AI Foundation
              </button>
            </div>
          </div>

          <div className="flex-1" />

          <div className="border-t border-[#e8e1ff] p-3">
            <div className="rounded-[18px] bg-[#ececec] p-4 text-[#8a8a8a]">
              Create me a blog on housing policy.
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-[#6d5df6]">
                <button className="rounded-full bg-[#efefff] px-3 py-1.5">
                  History
                </button>
                <button className="rounded-full bg-[#efefff] px-3 py-1.5">
                  Start new chat
                </button>
              </div>

              <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5d53f7] text-white">
                ↑
              </button>
            </div>
          </div>
        </aside>

        {/* right panel */}
        <main className="bg-[#f4f4f4] p-5">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex w-full max-w-[540px] items-center gap-3 rounded-full bg-[#ececec] px-4 py-3">
              <Sparkles size={16} className="text-[#7d69ff]" />
              <input
                placeholder={`Search the ${signal.title.toLowerCase()}`}
                className="flex-1 bg-transparent text-sm text-[#444] outline-none placeholder:text-[#888]"
              />
              <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dfdfdf] text-[#858585]">
                <Search size={16} />
              </button>
            </div>

            <div className="ml-5 flex items-center gap-2 rounded-full bg-[#ececec] p-1.5">
              <button className="flex h-10 w-12 items-center justify-center rounded-full bg-white text-[#6d5df6] shadow-sm">
                <LayoutGrid size={18} />
              </button>
              <button className="flex h-10 w-12 items-center justify-center rounded-full text-[#8d8d8d]">
                <List size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {items.map((item) => (
              <SignalListCard key={item.id} item={item} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}