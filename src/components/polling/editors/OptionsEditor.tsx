import { useFieldArray, type Control } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FormInput } from "@/components/form/input";

type Props = {
  control: Control<any>;
  name: string; // e.g. "options" or `polls.${i}.options`
  label?: string;
  min?: number; // default 2
  max?: number; // default 4
};

export default function OptionsEditor({
  control,
  name,
  label = "Options",
  min = 2,
  max = 4,
}: Props) {
  const optionsArray = useFieldArray({ control, name });
  const total = optionsArray.fields.length;

  const reachedMax = total >= max;
  const belowMin = total <= min;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        {reachedMax && (
          <span className="text-xs text-zinc-500">(Max options reached)</span>
        )}
      </div>

      {/* Option Fields */}
      <div className="flex flex-col gap-3">
        {optionsArray.fields.map((f, idx) => (
          <div
            key={f.id}
            className="flex items-start gap-2 rounded-md px-1 py-1 transition-colors"
          >
            <div className="flex-1">
              <FormInput
                control={control}
                name={`${name}.${idx}.text`}
                label={`Option #${idx + 1}`}
                placeholder={`Write option ${idx + 1}`}
              />
            </div>

            <div className="pt-[26px]">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => optionsArray.remove(idx)}
                disabled={belowMin}
                className={cn(
                  "text-zinc-400 hover:text-red-400 transition",
                  belowMin && "opacity-40 cursor-not-allowed"
                )}
              >
                ×
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Option Button */}
      <div className="flex justify-end pt-1">
        <Button
          type="button"
          size="sm"
          className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={reachedMax}
          onClick={() => optionsArray.append({ text: "" })}
        >
          + Add Option
        </Button>
      </div>
    </div>
  );
}
