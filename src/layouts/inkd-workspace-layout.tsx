import { ReactNode } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Props = {
  children: ReactNode;
};

export function InkdWorkspaceLayout({ children }: Props) {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f3f3f5]">
      {/* Left chat panel */}
      <aside className="flex h-full w-[400px] xl:w-[500px] max-w-[500px] flex-col border-r border-[#e6e7eb] bg-white pt-2">
        {/* top */} 
          <div className="flex items-center justify-between rounded-[20px] bg-[#eef0f3] px-2 py-3 mx-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#4a4a4a] transition hover:bg-white/70"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="h-7 w-7 overflow-hidden rounded-full bg-neutral-300">
                <img
                  src="https://placehold.co/100x100"
                  alt="agent"
                  className="h-full w-full object-cover"
                />
              </div>

              <h1 className="text-[18px] font-medium text-[#202020]">
                The Chart
              </h1>
            </div>

            <button className="flex items-center gap-2 rounded-full bg-[#5b4df7] px-4 py-2 text-xs xl:text-sm text-white shadow-sm">
              <Sparkles size={14} />
              Configure AI Foundation
            </button>
          </div> 

        {/* empty conversation area */}
        <div className="flex-1" />

        {/* bottom composer */}
        <div className="border-t border-[#e8e8ed] p-3">
          <div className="rounded-[16px] bg-[#ececef] px-4 py-4 text-[18px] text-[#a0a0aa]">
            Create me a blog on housing policy.
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button className="rounded-full bg-[#ececff] px-3 py-1.5 text-sm text-[#5b4df7]">
                ↺ History
              </button>
              <button className="rounded-full bg-[#ececff] px-3 py-1.5 text-sm text-[#5b4df7]">
                Start new chat
              </button>
            </div>

            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5b4df7] text-white">
              ↑
            </button>
          </div>
        </div>
      </aside>

      {/* Right content area */}
      <main className="min-w-0 flex-1 overflow-y-auto p-4">
        {children}
      </main>
    </div>
  );
}