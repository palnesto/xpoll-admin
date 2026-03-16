import {
  ListPlus,
  CaseSensitive,
  Wrench,
  ListRestart,
  Cog,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  INKD_CREATE_STEPS,
  STEP_ID_TO_TAB_PARAM,
  type InkdCreateStepId,
} from "@/schema/inkd-agent-create.schema";

const STEP_ICONS: Record<InkdCreateStepId, LucideIcon> = {
  foundational: ListPlus,
  brand: CaseSensitive,
  settings: Wrench,
  priority: ListRestart,
  rewards: Cog,
};

type Props = {
  activeStepId: InkdCreateStepId;
  stepIndex: number;
  onStepClick: (stepId: InkdCreateStepId) => void;
};

export function CreateAgentTabs({
  activeStepId,
  stepIndex,
  onStepClick,
}: Props) {
  return (
    <div className="mb-10 flex justify-center gap-7 rounded-full p-4">
      {INKD_CREATE_STEPS.map((step, idx) => {
        const isActive = activeStepId === step.id;
        const isClickable = idx <= stepIndex;
        const Icon = STEP_ICONS[step.id];
        return (
          <a
            key={step.id}
            href={`/inkd/create?tab=${STEP_ID_TO_TAB_PARAM[step.id]}`}
            onClick={(e) => {
              if (!isClickable) {
                e.preventDefault();
                return;
              }
              e.preventDefault();
              onStepClick(step.id);
            }}
            className={cn(
              "flex items-center gap-2 rounded-full py-2 font-semibold tracking-[0.18em] uppercase transition",
              isActive ? "px-6 text-[#5E6366]" : "px-4 text-[#999]",
              isClickable ? "cursor-pointer" : "cursor-not-allowed",
            )}
          >
            <Icon className="h-6 w-6 shrink-0" />
            {isActive ? <span>{step.label}</span> : null}
          </a>
        );
      })}
    </div>
  );
}
