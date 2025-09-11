import React from "react";
import { useController, type Control } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Props = {
  control: Control<any>;
  name: string; // e.g. "expireRewardAt" or "trial.expireRewardAt"
  label?: string;
};

export default function ExpireRewardAtPicker({
  control,
  name,
  label = "Expire Reward At (optional)",
}: Props) {
  const { field, fieldState } = useController({ control, name });
  const current: Date | undefined =
    field.value && String(field.value).trim()
      ? new Date(field.value)
      : undefined;

  const [localTime, setLocalTime] = React.useState("12:00");

  React.useEffect(() => {
    if (current && !isNaN(current.getTime())) {
      const hh = String(current.getHours()).padStart(2, "0");
      const mm = String(current.getMinutes()).padStart(2, "0");
      setLocalTime(`${hh}:${mm}`);
    }
  }, [field.value]);

  function commit(newDate: Date | undefined, timeStr: string) {
    if (!newDate) {
      field.onChange("");
      return;
    }
    const [hh, mm] = timeStr.split(":").map((n) => parseInt(n || "0", 10));
    const d = new Date(newDate);
    if (!Number.isNaN(hh)) d.setHours(hh);
    if (!Number.isNaN(mm)) d.setMinutes(mm);
    d.setSeconds(0);
    d.setMilliseconds(0);
    field.onChange(d.toISOString()); // store ISO so zod .datetime() passes
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-[280px] justify-start text-left font-normal",
              !current && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {current ? current.toLocaleString() : "Pick date & time"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <div className="flex gap-3">
            <Calendar
              mode="single"
              selected={current}
              onSelect={(d: Date | undefined) => commit(d, localTime)}
              initialFocus
            />
            <div className="flex flex-col gap-2">
              <label className="text-xs text-muted-foreground">Time</label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={localTime}
                  onChange={(e) => {
                    const t = e.target.value || "12:00";
                    setLocalTime(t);
                    commit(current ?? new Date(), t);
                  }}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => field.onChange("")}
              >
                Clear
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {fieldState.error?.message && (
        <p className="text-sm text-destructive">{fieldState.error.message}</p>
      )}
    </div>
  );
}
