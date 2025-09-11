import { useFieldArray, type Control, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label} ({min}–{max})
      </label>

      {optionsArray.fields.map((f, idx) => (
        <div key={f.id} className="flex gap-2 items-start">
          <div className="flex-1">
            <Controller
              control={control}
              name={`${name}.${idx}.text`}
              render={({ field, fieldState }) => (
                <>
                  <Input placeholder={`Option #${idx + 1}`} {...field} />
                  {fieldState.error?.message && (
                    <p className="mt-1 text-sm text-destructive">
                      {fieldState.error.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>
          <div className="pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => optionsArray.remove(idx)}
              disabled={optionsArray.fields.length <= min}
            >
              Remove
            </Button>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => optionsArray.append({ text: "" })}
          disabled={optionsArray.fields.length >= max}
        >
          Add Option
        </Button>
      </div>
    </div>
  );
}
