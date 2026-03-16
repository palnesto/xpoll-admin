import type { UseFormReturn } from "react-hook-form";
import { useMemo } from "react";
import { X } from "lucide-react";
import { NumberField } from "@/components/commons/form/NumberField";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CountrySelect from "@/components/commons/selects/country-select";
import StateSelect from "@/components/commons/selects/state-select";
import CitySelect from "@/components/commons/selects/city-select";
import IndustryInfiniteSelect from "@/components/commons/selects/industry-infinite-select";
import { inkdAgentCreateFormSchema } from "@/schema/inkd-agent-create.schema";
import type { z } from "zod";
import { INKD_INTERNAL_AGENT_WEEKDAYS } from "@/constants/inkd";
import { cn } from "@/lib/utils";

const INPUT_CLASS =
  "border-[#DDE2E5] focus:border-[#E8EAED] focus:ring-1 focus:ring-[#E8EAED] focus-visible:outline-none text-[#111] placeholder:text-[#9a9aab]";

type FormValues = import("@/schema/inkd-agent-create.schema").InkdAgentCreateFormValues;

export type GeoOption = { value: string; label: string };
export type IndustryOption = { value: string; label: string };

type Props = {
  form: UseFormReturn<FormValues>;
  countryOpts: GeoOption[];
  setCountryOpts: (opts: GeoOption[]) => void;
  stateOpts: GeoOption[];
  setStateOpts: (opts: GeoOption[]) => void;
  cityOpts: GeoOption[];
  setCityOpts: (opts: GeoOption[]) => void;
  industryOpts: IndustryOption[];
  setIndustryOpts: (opts: IndustryOption[]) => void;
};

export function SettingsStep({
  form,
  countryOpts,
  setCountryOpts,
  stateOpts,
  setStateOpts,
  cityOpts,
  setCityOpts,
  industryOpts,
  setIndustryOpts,
}: Props) {
  const {
    formState: { errors },
  } = form;

  const scheduleRules = form.watch("scheduleRules") ?? [];

  const weekdayLabel = (day: string) =>
    day.charAt(0).toUpperCase() + day.slice(1);

  const addScheduleRule = () => {
    if (Array.isArray(scheduleRules) && scheduleRules.length >= 3) return;
    const next = [...scheduleRules, { weekdays: [], timeUtc: "" }];
    form.setValue("scheduleRules", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const updateWeekday = (index: number, day: (typeof INKD_INTERNAL_AGENT_WEEKDAYS)[number]) => {
    const cur = scheduleRules[index] ?? { weekdays: [] as (typeof INKD_INTERNAL_AGENT_WEEKDAYS)[number][], timeUtc: "" };
    const has = cur.weekdays?.includes(day);
    const nextWeekdays = has
      ? cur.weekdays.filter((d: (typeof INKD_INTERNAL_AGENT_WEEKDAYS)[number]) => d !== day)
      : [...(cur.weekdays ?? []), day];
    const next = scheduleRules.slice();
    next[index] = { ...cur, weekdays: nextWeekdays };
    form.setValue("scheduleRules", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const updateTime = (index: number, time: string) => {
    const cur = scheduleRules[index] ?? { weekdays: [], timeUtc: "" };
    const next = scheduleRules.slice();
    next[index] = { ...cur, timeUtc: time };
    form.setValue("scheduleRules", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const removeRule = (index: number) => {
    const next = scheduleRules.filter((_: unknown, i: number) => i !== index);
    form.setValue("scheduleRules", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const scheduleError = useMemo(() => {
    return (errors as any)?.scheduleRules as
      | { message?: string }
      | Array<{
        weekdays?: { message?: string };
        timeUtc?: { message?: string };
      }>
      | undefined;
  }, [errors]);

  return (
    <div className="grid grid-cols-3 gap-6">
      <NumberField<FormValues>
        form={form}
        schema={inkdAgentCreateFormSchema as unknown as z.ZodObject<any>}
        name="maxBlogDescriptionLength"
        label="Blog length"
        placeholder="10000"
        decimalScale={0}
        helperText="Characters per blog description"
        showError
        inputClassName={INPUT_CLASS}
        className="text-[#5E6366]"
      />
      <NumberField<FormValues>
        form={form}
        schema={inkdAgentCreateFormSchema as unknown as z.ZodObject<any>}
        name="maxLinkedTrial"
        label="No of trails to be create per blog"
        placeholder="12"
        decimalScale={0}
        showError
        inputClassName={INPUT_CLASS}
        className="text-[#5E6366]"
      />
      <NumberField<FormValues>
        form={form}
        schema={inkdAgentCreateFormSchema as unknown as z.ZodObject<any>}
        name="maxLinkedPoll"
        label="No of polls per trail"
        placeholder="12"
        decimalScale={0}
        showError
        inputClassName={INPUT_CLASS}
        className="text-[#5E6366]"
      />

      <div className="col-span-3 grid grid-cols-3 gap-6">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-[#5E6366]">
            Country
          </Label>
          <CountrySelect
            value={countryOpts}
            onChange={(opts) => setCountryOpts(opts as GeoOption[])}
            placeholder="Rhode Island"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-[#5E6366]">
            State
          </Label>
          <StateSelect
            value={stateOpts}
            onChange={(opts) => setStateOpts(opts as GeoOption[])}
            placeholder="Rhode Island"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-[#5E6366]">
            City
          </Label>
          <CitySelect
            value={cityOpts}
            onChange={(opts) => setCityOpts(opts as GeoOption[])}
            placeholder="Rhode Island"
          />
        </div>

        <div className="col-span-3 space-y-1">
          <Label className="text-xs font-semibold text-[#5E6366]">
            Targeted Industries
          </Label>
          <IndustryInfiniteSelect
            onChange={(opt) =>
              setIndustryOpts(
                opt ? [{ value: opt.value, label: opt.label }] : [],
              )
            }
            placeholder="Finance, Healthcare…"
          />
        </div>

        <div className="col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-semibold text-[#5E6366]">
                Schedule blog posts
              </Label>
              <p className="mt-1 text-[11px] text-[#7a7a87]">
                Choose days and a time (UTC) for auto-generated blogs. Max 3 schedules.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addScheduleRule}
              disabled={Array.isArray(scheduleRules) && scheduleRules.length >= 3}
              className="rounded-full border-[#DDE2E5] bg-white px-3 text-[11px] font-semibold text-[#315326] hover:bg-[#E4F2DF]"
            >
              + Add schedule
            </Button>
          </div>

          {Array.isArray(scheduleRules) && scheduleRules.length > 0 && (
            <div className="rounded-2xl border border-dashed border-[#DDE2E5] bg-[#F8FAFD] px-4 py-3">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#7a7a87]">
                Current schedule
              </p>
              <div className="space-y-1.5 text-[11px] text-[#424550]">
                {scheduleRules.map(
                  (
                    rule: { weekdays?: string[]; timeUtc?: string },
                    index: number,
                  ) => {
                    const days =
                      rule.weekdays && rule.weekdays.length
                        ? rule.weekdays
                            .map((d) => weekdayLabel(d))
                            .join(", ")
                        : "No days";
                    const time = rule.timeUtc || "No time";
                    return (
                      <div
                        key={`preview-${index}`}
                        className="flex items-center justify-between"
                      >
                        <span>
                          {index + 1}. {days}
                        </span>
                        <span className="font-medium">{time} UTC</span>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          )}

          {Array.isArray(scheduleRules) && scheduleRules.length > 0 && (
            <div className="space-y-3">
              {scheduleRules.map(
                (
                  rule: { weekdays?: string[]; timeUtc?: string },
                  index: number,
                ) => {
                  const rowErr =
                    Array.isArray(scheduleError) && scheduleError[index]
                      ? scheduleError[index]
                      : undefined;
                  return (
                    <div
                      key={index}
                      className="rounded-2xl border border-[#E2E4EA] bg-white px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div>
                            <p className="text-[11px] font-medium text-[#55596A]">
                              Days
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {INKD_INTERNAL_AGENT_WEEKDAYS.map((day) => {
                                const selected =
                                  rule.weekdays?.includes(day) ?? false;
                                return (
                                  <button
                                    key={day}
                                    type="button"
                                    onClick={() => updateWeekday(index, day)}
                                    className={cn(
                                      "rounded-full border px-2 py-1 text-[11px] capitalize",
                                      selected
                                        ? "border-[#315326] bg-[#E4F2DF] text-[#315326]"
                                        : "border-[#DDE2E5] bg-white text-[#5E6366] hover:bg-[#F3F4F6]",
                                    )}
                                  >
                                    {weekdayLabel(day)}
                                  </button>
                                );
                              })}
                            </div>
                            {rowErr?.weekdays?.message && (
                              <p className="mt-1 text-[11px] text-red-600">
                                {rowErr.weekdays.message}
                              </p>
                            )}
                          </div>

                          <div className="max-w-[160px]">
                            <p className="text-[11px] font-medium text-[#55596A]">
                              Time (UTC)
                            </p>
                            <Input
                              type="time"
                              value={rule.timeUtc ?? ""}
                              onChange={(e) => updateTime(index, e.target.value)}
                              className={cn(
                                "mt-1 h-8 text-xs",
                                INPUT_CLASS,
                                rowErr?.timeUtc?.message && "border-red-500",
                              )}
                            />
                            {rowErr?.timeUtc?.message && (
                              <p className="mt-1 text-[11px] text-red-600">
                                {rowErr.timeUtc.message}
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeRule(index)}
                          className="mt-1 rounded-full p-1 text-[#7a7a87] hover:bg-[#F3F4F6]"
                          aria-label="Remove schedule"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}

          {scheduleError && !Array.isArray(scheduleError) && (
            <p className="text-[11px] text-red-600">
              {scheduleError.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
