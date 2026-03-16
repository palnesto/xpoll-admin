import { useEffect, useMemo, useRef } from "react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { endpoints } from "@/api/endpoints";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;
const LAST_N_MINUTES = 5;

type TaskLogState = "queued" | "running" | "completed" | "failed" | "cancelled";
type TaskLogTriggerSource = "manual" | "scheduled";

type InkDTaskLogEntry = {
  _id: string;
  triggerSource: TaskLogTriggerSource;
  scheduledForUtc: string | null;
  state: TaskLogState;
  metadata?: {
    success?: {
      data?: {
        createdInkDArtifacts?: {
          blogId?: string | null;
          trialIds?: string[];
          pollIds?: string[];
        };
      };
    };
    failure?: {
      lastCode?: string | null;
      lastMessage?: string | null;
    };
    cancellation?: {
      reason?: string | null;
    };
  };
};

type Props = {
  inkdInternalAgentId?: string;
  onCompletedLogDetected?: () => void;
};

function formatUtcTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

function trimText(value: string, maxLength = 140) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function buildLogDescription(entry: InkDTaskLogEntry) {
  const scheduledTime = formatUtcTime(entry.scheduledForUtc);
  const sourcePrefix =
    entry.triggerSource === "manual"
      ? "Manual run"
      : scheduledTime
        ? `Scheduled for ${scheduledTime} UTC`
        : "Scheduled run";

  const createdInkDArtifacts = entry.metadata?.success?.data?.createdInkDArtifacts;
  const createdBlogCount = createdInkDArtifacts?.blogId ? 1 : 0;
  const createdTrialCount = Array.isArray(createdInkDArtifacts?.trialIds)
    ? createdInkDArtifacts.trialIds.length
    : 0;
  const createdPollCount = Array.isArray(createdInkDArtifacts?.pollIds)
    ? createdInkDArtifacts.pollIds.length
    : 0;

  if (entry.state === "completed") {
    const createdParts = [
      createdBlogCount ? `${createdBlogCount} blog` : null,
      createdTrialCount ? `${createdTrialCount} trial${createdTrialCount === 1 ? "" : "s"}` : null,
      createdPollCount ? `${createdPollCount} poll${createdPollCount === 1 ? "" : "s"}` : null,
    ].filter(Boolean);

    if (createdParts.length > 0) {
      return `${sourcePrefix}. Completed and created ${createdParts.join(", ")}.`;
    }

    return `${sourcePrefix}. Completed successfully.`;
  }

  if (entry.state === "failed") {
    const failureMessage =
      entry.metadata?.failure?.lastMessage ??
      entry.metadata?.failure?.lastCode ??
      "Generation failed before completion.";
    return trimText(`${sourcePrefix}. Failed: ${failureMessage}`);
  }

  if (entry.state === "cancelled") {
    const reason = entry.metadata?.cancellation?.reason;
    return trimText(
      reason ? `${sourcePrefix}. Cancelled: ${reason}` : `${sourcePrefix}. Cancelled before completion.`,
    );
  }

  if (entry.state === "running") {
    return `${sourcePrefix}. Generation is currently running.`;
  }

  return `${sourcePrefix}. Waiting in the queue to be processed.`;
}

function getStatusPillClasses(state: TaskLogState) {
  if (state === "running") return "bg-[#5d6bff] text-white";
  if (state === "queued") return "bg-[#7380ff] text-white";
  if (state === "completed") return "bg-[#e7f8ec] text-[#2d9b54]";
  if (state === "failed") return "bg-[#ffe9e4] text-[#e95b35]";
  return "bg-[#ececf2] text-[#747486]";
}

function getStatusLabel(state: TaskLogState) {
  if (state === "running") return "Running";
  if (state === "queued") return "Queued";
  if (state === "completed") return "Completed";
  if (state === "failed") return "Failed";
  return "Cancelled";
}

function StatusDot({ state }: { state: TaskLogState }) {
  if (state === "running") {
    return (
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
      </span>
    );
  }

  if (state === "queued") {
    return <span className="inline-flex h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-white" />;
  }

  if (state === "completed") {
    return <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-[#2d9b54]" />;
  }

  if (state === "failed") {
    return <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-[#e95b35]" />;
  }

  return <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-[#747486]" />;
}

export function AgentLogsSection({
  inkdInternalAgentId,
  onCompletedLogDetected,
}: Props) {
  const previousStatesRef = useRef<Map<string, TaskLogState>>(new Map());

  const route = useMemo(() => {
    if (!inkdInternalAgentId) return null;

    const params = new URLSearchParams({
      page: "1",
      pageSize: String(PAGE_SIZE),
      inkdInternalAgentIdCSV: inkdInternalAgentId,
      lastNMinutes: String(LAST_N_MINUTES),
    });

    return `${endpoints.entities.inkd.internalAgent.taskLogsAdvanced}?${params.toString()}`;
  }, [inkdInternalAgentId]);

  const { data, isLoading } = useApiQuery(route ?? "", {
    queryKey: ["inkd-agent-logs", inkdInternalAgentId],
    enabled: !!route,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  } as any);

  const payload = data?.data?.data ?? {};
  const entries: InkDTaskLogEntry[] = Array.isArray(payload.entries) ? payload.entries : [];
  const hasEntries = entries.length > 0;

  useEffect(() => {
    const nextStates = new Map<string, TaskLogState>();
    let completedTransitionDetected = false;

    for (const entry of entries) {
      nextStates.set(entry._id, entry.state);

      const previousState = previousStatesRef.current.get(entry._id);
      if (previousState && previousState !== "completed" && entry.state === "completed") {
        completedTransitionDetected = true;
      }
    }

    previousStatesRef.current = nextStates;

    if (completedTransitionDetected) {
      onCompletedLogDetected?.();
    }
  }, [entries, onCompletedLogDetected]);

  if (!hasEntries) {
    return null;
  }

  return (
    <section className="mb-6">
      <div className="rounded-[22px] bg-[linear-gradient(90deg,#38c8f3_0%,#4b8ef6_55%,#6a51f5_100%)] p-[4px] shadow-[0_18px_50px_rgba(90,103,245,0.14)]">
        <div className="px-4 pb-3 pt-2 text-white">
          <h2 className="text-[22px] font-normal leading-none tracking-[-0.03em]">
            Agent logs
          </h2>
        </div>

        <div className="rounded-[18px] bg-white px-4 py-3">
          {isLoading && entries.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-4 rounded-[14px] px-3 py-2"
                >
                  <div className="h-4 w-full max-w-[420px] animate-pulse rounded-full bg-[#eef0f7]" />
                  <div className="h-9 w-[92px] animate-pulse rounded-full bg-[#eef0f7]" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry._id}
                  className={cn(
                    "flex items-center justify-between gap-4 rounded-[14px] px-3 py-2 transition-colors",
                    entry.state === "running" && "bg-[#f4f6ff]",
                    entry.state === "queued" && "bg-[#f8f9ff]",
                    entry.state === "completed" && "bg-[#f7fcf8]",
                    entry.state === "failed" && "bg-[#fff8f6]",
                    entry.state === "cancelled" && "bg-[#f7f7fa]",
                  )}
                >
                  <p className="min-w-0 flex-1 truncate text-[13px] font-normal text-[#1e1e22]">
                    {buildLogDescription(entry)}
                  </p>

                  <span
                    className={cn(
                      "inline-flex h-[30px] min-w-[96px] shrink-0 items-center justify-center gap-2 rounded-full px-3 text-[11px] font-medium",
                      getStatusPillClasses(entry.state),
                    )}
                  >
                    <StatusDot state={entry.state} />
                    {getStatusLabel(entry.state)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
