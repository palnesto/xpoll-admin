import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { INKD_CREATE_STEPS } from "@/schema/inkd-agent-create.schema";

type Props = {
  stepIndex: number;
  isSubmitting: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
  validationError?: string;
};

export function CreateAgentFooter({
  stepIndex,
  isSubmitting,
  canGoNext,
  onBack,
  onNext,
  validationError,
}: Props) {
  const isLastStep = stepIndex === INKD_CREATE_STEPS.length - 1;

  return (
    <div className="mt-7 flex items-center justify-between mx-auto max-w-2xl">
      <div className="flex items-center gap-4">
        {validationError ? (
          <span className="text-xs text-[#f35]">{validationError}</span>
        ) : null}
        <Button
        type="button"
        variant="outline"
        onClick={onBack}
        disabled={stepIndex === 0 || isSubmitting}
        className="rounded-full px-8 bg-[#E8E8EC] border-[#DDE2E5] text-[#111] hover:bg-[#DFE0E4]"
      >
        Back
      </Button>
      </div>

      <Button
        type="button"
        onClick={onNext}
        disabled={!canGoNext}
        className={cn(
          "rounded-full px-10 text-white",
          canGoNext
            ? "bg-[#6b63f6] hover:bg-[#574ee8]"
            : "bg-[#BFBFBF] cursor-not-allowed opacity-70",
        )}
      >
        {isLastStep ? "Launch Signal AI" : "Next"}
      </Button>
    </div>
  );
}
