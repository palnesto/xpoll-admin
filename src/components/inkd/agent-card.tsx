import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { useApiMutation } from "@/hooks/useApiMutation";
import { endpoints } from "@/api/endpoints";
import { utcToAdminNextScheduleLabel } from "@/utils/time";

export type InkdAgentStatus = "active" | "idle";

export type InkdInternalAgentEntry = {
  _id: string;
  internalAgentId: string;
  name: string;
  status: string;
  nextSchedule?: string | null;
  totalInkBlogsCreated?: {
    archivedIncluded: number;
    archivedExcluded: number;
  };
  uniqueTargetLocations?: number;
  linkedIndustries?: Array< { _id: string; name: string; description?: string } >;
};

type Props = {
  agent: InkdInternalAgentEntry;
};

const LIST_QUERY_KEY = ["inkd-internal-agents-advanced"] as const;

export function AgentCard({ agent }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate: changeStatus, isPending: isChangingStatus } = useApiMutation<
    { inkDInternalAgentId: string; status: InkdAgentStatus },
    unknown
  >({
    route: endpoints.entities.inkd.internalAgent.changeAgentStatus,
    method: "POST",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LIST_QUERY_KEY });
    },
  });

  const blogCount = agent.totalInkBlogsCreated?.archivedExcluded ?? 0;
  const locationCount = agent.uniqueTargetLocations ?? 0;
  const industryNames = (agent.linkedIndustries ?? [])
    .map((i) => i.name)
    .filter(Boolean);
  const categoryLabel = industryNames.length > 0 ? industryNames.join(", ") : "—";
  const nextScheduleLabel = agent.nextSchedule
    ? utcToAdminNextScheduleLabel(agent.nextSchedule)
    : "";

  const status = (agent.status?.toLowerCase() === "idle" ? "idle" : "active") as InkdAgentStatus;
  const nextStatus: InkdAgentStatus = status === "active" ? "idle" : "active";

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isChangingStatus) return;
    changeStatus({ inkDInternalAgentId: agent._id, status: nextStatus });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() =>
        navigate(`/inkd/inkd-internal-agents/details/${agent._id}`, {
          state: { agentName: agent.name },
        })
      }
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/inkd/inkd-internal-agents/details/${agent._id}`, {
            state: { agentName: agent.name },
          });
        }
      }}
      className={`rounded-[24px] bg-[#e8ebf2] p-4 space-y-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition-transform duration-200 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_10px_rgba(0,0,0,0.1)] ${
        status === "idle"
          ? "opacity-65 saturate-[0.72]"
          : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-2xl text-black flex-1 truncate">{agent.name}</h3>
        <div className="flex items-center gap-2 shrink-0" onClick={handleToggle} role="group" aria-label="Agent status">
          <span
            className={`rounded-full px-3 py-1 text-xs capitalize shrink-0 border-b  ${
              status === "active"
                ? "bg-[#e3f6e7] text-[#3b9b56] border-b-[#3b9b56]"
                : "bg-[#ececed] text-[#8a8a94] border-b-[#8a8a94]"
            }`}
          >
            {agent.status}
          </span>
          <Switch
            checked={status === "active"}
            disabled={isChangingStatus}
            aria-label={`Toggle status to ${nextStatus}`}
            className="data-[state=checked]:bg-[#e3f6e7] data-[state=unchecked]:bg-[#e5e5e8]"
            thumbClassName="group-data-[state=checked]:bg-[#6cc070] group-data-[state=unchecked]:bg-[#c8c8cf]"
            onCheckedChange={() => {
              if (!isChangingStatus) changeStatus({ inkDInternalAgentId: agent._id, status: nextStatus });
            }}
          />
        </div> 
      </div>

      <section className="rounded-[18px] bg-white/70 p-4">
        <p className="text-xs font-medium uppercase text-[#939393]">
          Output
        </p>
        <p className="mt-1 text-4xl text-black">{blogCount}</p>
        <p className="mt-1 text-sm text-[#939393]">Blogs Generated</p>
      </section>

      <div className="mt-4 flex gap-2">
        <div className="flex-1 rounded-full bg-white px-4 py-2 text-center text-xs text-[#404956]">
          {locationCount} Location added
        </div>
        <div className="flex-1 rounded-full bg-white px-4 py-2 text-center text-xs text-[#404956] truncate" title={categoryLabel}>
          {categoryLabel}
        </div>
      </div>

      <div
        className={`mt-4 rounded-[18px] px-4 py-3 text-center ${
          nextScheduleLabel
            ? "bg-[#5649FF] text-white"
            : "bg-[#d9dce5] text-[#72798a]"
        }`}
      >
        <div
          className={`flex items-center justify-center gap-2 text-[11px] font-semibold tracking-[0.04em] ${
            nextScheduleLabel ? "text-white/72" : "text-[#8e95a5]"
          }`}
        >
          {nextScheduleLabel ? (
            <span className="inline-flex h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-white" />
          ) : null}
          Next scheduled at
        </div>
        <div
          className={`mt-1 text-sm ${
            nextScheduleLabel ? "text-white" : "text-[#72798a]"
          }`}
        >
          {nextScheduleLabel || "No schedule set"}
        </div>
      </div>
    </div>
  );
}
