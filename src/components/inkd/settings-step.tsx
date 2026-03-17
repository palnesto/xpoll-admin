import type { UseFormReturn } from "react-hook-form";
import { useMemo, useState } from "react";
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
import { INKD_INTERNAL_AGENT_WEEKDAYS, MAX_TARGETED_INDUSTRIES } from "@/constants/inkd";
import { cn } from "@/lib/utils";
import { adminZone } from "@/utils/time";

const INPUT_CLASS =
  "border-[#DDE2E5] bg-white focus:border-[#E8EAED] focus:ring-1 focus:ring-[#E8EAED] focus-visible:outline-none text-[#111] placeholder:text-[#9a9aab]";

/** Light-theme styles for Country/State/City (create + edit). Use menuPortalTarget so dropdown opens above modal. */
const INKD_GEO_SELECT_PROPS = {
  menuPortalTarget: typeof document !== "undefined" ? document.body : undefined,
  styles: {
    control: (provided: Record<string, unknown>) => ({
      ...provided,
      minHeight: 44,
      borderRadius: "1rem",
      borderColor: "#DDE2E5",
      backgroundColor: "#fff",
      color: "#111",
      "&:hover": { borderColor: "#DDE2E5" },
    }),
    placeholder: (provided: Record<string, unknown>) => ({
      ...provided,
      color: "#9a9aab",
      fontSize: "0.875rem",
      fontWeight: 400,
    }),
    input: (provided: Record<string, unknown>) => ({
      ...provided,
      color: "#111",
    }),
    singleValue: (provided: Record<string, unknown>) => ({
      ...provided,
      color: "#111",
    }),
    valueContainer: (provided: Record<string, unknown>) => ({
      ...provided,
      backgroundColor: "transparent",
    }),
    multiValue: (provided: Record<string, unknown>) => ({
      ...provided,
      backgroundColor: "#E8E8EC",
      borderRadius: "9999px",
    }),
    multiValueLabel: (provided: Record<string, unknown>) => ({
      ...provided,
      color: "#111",
    }),
    multiValueRemove: (provided: Record<string, unknown>) => ({
      ...provided,
      color: "#5E6366",
    }),
    dropdownIndicator: (provided: Record<string, unknown>) => ({
      ...provided,
      color: "#5E6366",
    }),
    clearIndicator: (provided: Record<string, unknown>) => ({
      ...provided,
      color: "#5E6366",
    }),
    menuPortal: (provided: Record<string, unknown>) => ({
      ...provided,
      zIndex: 99999,
      pointerEvents: "auto" as const,
    }),
    menu: (provided: Record<string, unknown>) => ({
      ...provided,
      backgroundColor: "#fff",
      border: "1px solid #DDE2E5",
      borderRadius: "0.5rem",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    }),
    menuList: (provided: Record<string, unknown>) => ({
      ...provided,
      backgroundColor: "#fff",
      padding: 4,
    }),
    option: (provided: Record<string, unknown>, state: { isFocused?: boolean; isSelected?: boolean }) => ({
      ...provided,
      color: "#111",
      backgroundColor: state.isFocused || state.isSelected ? "#F3F4F6" : "#fff",
      fontSize: "0.875rem",
    }),
  } as const,
};

/** Targeted industries: match other inputs (border, radius, placeholder). */
const INKD_INDUSTRY_SELECT_PROPS = {
  menuPortalTarget: typeof document !== "undefined" ? document.body : undefined,
  styles: {
    control: (provided: Record<string, unknown>) => ({
      ...provided,
      minHeight: 44,
      borderRadius: "1rem",
      borderColor: "#DDE2E5",
      backgroundColor: "#fff",
      color: "#111",
      "&:hover": { borderColor: "#DDE2E5" },
    }),
    placeholder: (provided: Record<string, unknown>) => ({
      ...provided,
      color: "#9a9aab",
      fontSize: "0.875rem",
      fontWeight: 400,
    }),
    input: (provided: Record<string, unknown>) => ({
      ...provided,
      color: "#111",
    }),
    singleValue: (provided: Record<string, unknown>) => ({
      ...provided,
      color: "#111",
    }),
    menuPortal: (provided: Record<string, unknown>) => ({
      ...provided,
      zIndex: 99999,
      pointerEvents: "auto" as const,
    }),
    menu: (provided: Record<string, unknown>) => ({
      ...provided,
      backgroundColor: "#fff",
      border: "1px solid #DDE2E5",
      borderRadius: "0.5rem",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    }),
    menuList: (provided: Record<string, unknown>) => ({
      ...provided,
      backgroundColor: "#fff",
    }),
    option: (provided: Record<string, unknown>, state: { isFocused?: boolean; isSelected?: boolean }) => ({
      ...provided,
      color: "#111",
      backgroundColor: state.isFocused || state.isSelected ? "#F3F4F6" : "#fff",
      fontSize: "0.875rem",
    }),
  } as const,
};

const ADD_BUTTON_CLASS =
  "rounded-full bg-[#E4F2DF] px-4 py-1.5 text-[11px] font-semibold text-[#315326] hover:bg-[#d4e8cf] disabled:opacity-60 shrink-0";

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

  const [industryPickerKey, setIndustryPickerKey] = useState(0);
  const scheduleRules = form.watch("scheduleRules") ?? [];

  const addIndustry = (opt: IndustryOption | null) => {
    if (!opt) return;
    if (industryOpts.length >= MAX_TARGETED_INDUSTRIES) return;
    if (industryOpts.some((i) => i.value === opt.value)) {
      setIndustryPickerKey((k) => k + 1);
      return;
    }
    setIndustryOpts([...industryOpts, { value: opt.value, label: opt.label }]);
    setIndustryPickerKey((k) => k + 1);
  };

  const removeIndustry = (value: string) => {
    setIndustryOpts(industryOpts.filter((i) => i.value !== value));
  };

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

  const errs = errors as Record<string, { message?: string }>;

  return (
    <div className="grid grid-cols-2 gap-6">
      <NumberField<FormValues>
        form={form}
        schema={inkdAgentCreateFormSchema as unknown as z.ZodObject<any>}
        name="maxBlogDescriptionLength"
        label="Blog length"
        placeholder="10000"
        decimalScale={0}
        helperText={errs.maxBlogDescriptionLength?.message ?? "Characters per blog description"}
        showError={false}
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
        helperText={errs.maxLinkedTrial?.message ?? "Trails per blog"}
        showError={false}
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
        helperText={errs.maxLinkedPoll?.message ?? "Polls per trail"}
        showError={false}
        inputClassName={INPUT_CLASS}
        className="text-[#5E6366]"
      />
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-[#5E6366]">
            Country
          </Label>
          <CountrySelect
            value={countryOpts}
            onChange={(opts) => setCountryOpts(opts as GeoOption[])}
            placeholder="Rhode Island"
            selectProps={INKD_GEO_SELECT_PROPS}
          />
        </div>
      <div className="col-span-2 grid grid-cols-2 gap-6">
 
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-[#5E6366]">
            State
          </Label>
          <StateSelect
            value={stateOpts}
            onChange={(opts) => setStateOpts(opts as GeoOption[])}
            placeholder="Rhode Island"
            selectProps={INKD_GEO_SELECT_PROPS}
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
            selectProps={INKD_GEO_SELECT_PROPS}
          />
        </div>

        <div className="col-span-2 space-y-1">
          <Label className="text-xs font-semibold text-[#5E6366]">
            Targeted Industries (max {MAX_TARGETED_INDUSTRIES})
          </Label>
          <IndustryInfiniteSelect
            key={industryPickerKey}
            onChange={(opt) => addIndustry(opt ? { value: opt.value, label: opt.label } : null)}
            placeholder="Finance, Healthcare…"
            selectProps={{
              ...INKD_INDUSTRY_SELECT_PROPS,
              isDisabled: industryOpts.length >= MAX_TARGETED_INDUSTRIES,
            }}
          />
          {industryOpts.length > MAX_TARGETED_INDUSTRIES && (
            <p className="text-xs text-red-600">
              Max {MAX_TARGETED_INDUSTRIES} industries allowed.
            </p>
          )}
          {industryOpts.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {industryOpts.map((i) => (
                <span
                  key={i.value}
                  className="inline-flex items-center gap-1 rounded-full bg-[#E4F2DF] px-3 py-1 text-sm text-[#315326]"
                >
                  {i.label}
                  <button
                    type="button"
                    onClick={() => removeIndustry(i.value)}
                    className="hover:opacity-80"
                    aria-label={`Remove ${i.label}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-semibold text-[#5E6366]">
                Schedule blog posts
              </Label>
              <p className="mt-1 text-[11px] text-[#7a7a87]">
                Choose days and a time in your local timezone ({adminZone}) for auto-generated blogs. Max 3 schedules.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addScheduleRule}
              disabled={Array.isArray(scheduleRules) && scheduleRules.length >= 3}
              className={ADD_BUTTON_CLASS}
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
                        <span className="font-medium">{time} {adminZone}</span>
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
