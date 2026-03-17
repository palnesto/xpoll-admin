"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ListPlus,
  Languages, 
  ListRestart,
  Cog,
  Award ,
  X,
  type LucideIcon,
} from "lucide-react";
import apiInstance, { BASE_URL } from "@/api/queryClient";
import { endpoints } from "@/api/endpoints";
import { coinAssets } from "@/utils/currency-assets/asset";
import {
  inkdAgentCreateFormSchema,
  INKD_CREATE_STEPS,
  type InkdAgentCreateFormValues,
  type InkdCreateStepId,
} from "@/schema/inkd-agent-create.schema";
import type { InkdAgentApiDetail } from "@/schema/inkd-agent-edit.schema";
import { localScheduleRuleToUtc, utcScheduleRuleToLocal } from "@/utils/time";
import {
  getEditCacheForAgent,
  setEditCache,
} from "@/stores/inkdAgentEdit.store";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { FoundationalInfoStep } from "@/components/inkd/foundational-info-step";
import { BrandLanguageStep } from "@/components/inkd/brand-language-step";
import {
  SettingsStep,
  type GeoOption,
  type IndustryOption,
} from "@/components/inkd/settings-step";
import { PriorityScrapingStep } from "@/components/inkd/priority-scraping-step";
import { RewardDistributionStep } from "@/components/inkd/reward-distribution-step";

const STEP_ICONS: Record<InkdCreateStepId, LucideIcon> = {
  foundational: ListPlus,
  brand: Languages,
  settings: Cog,
  priority: ListRestart,
  rewards: Award,
};

function mapApiToFormValues(
  d: InkdAgentApiDetail,
): InkdAgentCreateFormValues & {
  countryOpts: GeoOption[];
  stateOpts: GeoOption[];
  cityOpts: GeoOption[];
  industryOpts: IndustryOption[];
} {
  const geo = d.targetGeo ?? { countries: [], states: [], cities: [] };
  const populated = d.targetGeoPopulated;
  const countryOpts = Array.isArray(populated?.countries) && populated.countries.length > 0
    ? populated.countries.map((c) => ({ value: c._id, label: c.name }))
    : (geo.countries ?? []).map((c) => ({ value: c, label: c }));
  const stateOpts = Array.isArray(populated?.states) && populated.states.length > 0
    ? populated.states.map((s) => ({ value: s._id, label: s.name }))
    : (geo.states ?? []).map((s) => ({ value: s, label: s }));
  const cityOpts = Array.isArray(populated?.cities) && populated.cities.length > 0
    ? populated.cities.map((c) => ({ value: c._id, label: c.name }))
    : (geo.cities ?? []).map((c) => ({ value: c, label: c }));

  return {
    name: d.name ?? "",
    foundationalInformation: d.foundationalInformation ?? "",
    brandLanguage: d.brandLanguage ?? "",
    maxBlogDescriptionLength: d.maxBlogDescriptionLength ?? 500,
    maxLinkedTrial: d.maxLinkedTrial ?? 10,
    maxLinkedPoll: d.maxLinkedPoll ?? 10,
    prioritySources:
      Array.isArray(d.prioritySources) && d.prioritySources.length > 0
        ? d.prioritySources.slice(0, 5)
        : [""],
    fallbackImageUrl: d.fallbackImageUrl?.trim() ?? "",
    rewards: (d.rewards?.length
      ? d.rewards
      : [
          {
            assetId: coinAssets[0],
            amount: "",
            rewardAmountCap: "",
            rewardType: "max" as const,
          },
        ]
    ).map((r) => ({
      assetId: r.assetId,
      amount: r.amount ?? "",
      rewardAmountCap: r.rewardAmountCap ?? "",
      rewardType: r.rewardType ?? "max",
    })),
    countryOpts,
    stateOpts,
    cityOpts,
    industryOpts: (d.linkedIndustries ?? []).map((i) => ({
      value: i._id,
      label: i.name,
    })),
    scheduleRules: (d.scheduleRules ?? []).map((r) =>
      utcScheduleRuleToLocal({
        weekdays: r.weekdays ?? [],
        timeUtc: r.timeUtc ?? "",
      }),
    ),
  };
}

type Props = {
  agentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ConfigureAgentFoundationModal({
  agentId,
  open,
  onOpenChange,
}: Props) {
  const [activeStepId, setActiveStepId] = useState<InkdCreateStepId>("foundational");
  const [apiData, setApiData] = useState<InkdAgentApiDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [countryOpts, setCountryOpts] = useState<GeoOption[]>([]);
  const [stateOpts, setStateOpts] = useState<GeoOption[]>([]);
  const [cityOpts, setCityOpts] = useState<GeoOption[]>([]);
  const [industryOpts, setIndustryOpts] = useState<IndustryOption[]>([]);

  const defaultValues = useMemo(
    (): InkdAgentCreateFormValues => ({
      name: "",
      foundationalInformation: "",
      brandLanguage: "",
      maxBlogDescriptionLength: 500,
      maxLinkedTrial: 10,
      maxLinkedPoll: 10,
      prioritySources: [""],
      fallbackImageUrl: "",
      rewards: [
        {
          assetId: coinAssets[0],
          amount: "",
          rewardAmountCap: "",
          rewardType: "max",
        },
      ],
      scheduleRules: [],
    }),
    [],
  );

  const form = useForm<InkdAgentCreateFormValues>({
    mode: "onChange",
    resolver: zodResolver(inkdAgentCreateFormSchema),
    defaultValues,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const prioritySourcesFieldArray = useFieldArray({
    control,
    name: "prioritySources" as any,
  });
  const priorityFields = prioritySourcesFieldArray.fields as unknown as Array<{ id: string }>;
  const append = prioritySourcesFieldArray.append as unknown as (value: string) => void;
  const { remove, move } = prioritySourcesFieldArray;

  const { fields: rewardFields, append: appendReward, remove: removeReward } =
    useFieldArray<InkdAgentCreateFormValues, "rewards", "id">({ control, name: "rewards" });

  const fetchAndPopulate = useCallback(async (id: string) => {
    setLoadError(null);
    try {
      const route = endpoints.entities.inkd.internalAgent.getById(id);
      const { data } = await apiInstance.get(`${BASE_URL}${route}`);
      const d = data?.data as InkdAgentApiDetail | undefined;
      if (!d) {
        setLoadError("Failed to load agent");
        return;
      }
      setApiData(d);
      const mapped = mapApiToFormValues(d);
      reset({
        name: mapped.name,
        foundationalInformation: mapped.foundationalInformation,
        brandLanguage: mapped.brandLanguage,
        maxBlogDescriptionLength: mapped.maxBlogDescriptionLength,
        maxLinkedTrial: mapped.maxLinkedTrial,
        maxLinkedPoll: mapped.maxLinkedPoll,
        prioritySources: mapped.prioritySources,
        fallbackImageUrl: mapped.fallbackImageUrl,
        rewards: mapped.rewards,
        scheduleRules: mapped.scheduleRules,
      });
      setCountryOpts(mapped.countryOpts);
      setStateOpts(mapped.stateOpts);
      setCityOpts(mapped.cityOpts);
      setIndustryOpts(mapped.industryOpts);
    } catch {
      setLoadError("Failed to load agent");
    }
  }, [reset]);

  useEffect(() => {
    if (!open || !agentId) return;
    const dPrime = getEditCacheForAgent(agentId);
    if (!dPrime) {
      fetchAndPopulate(agentId);
      return;
    }
    if (dPrime.internalAgentId !== agentId) {
      fetchAndPopulate(agentId);
      return;
    }
    setApiData(dPrime);
    const mapped = mapApiToFormValues(dPrime);
    reset({
      name: mapped.name,
      foundationalInformation: mapped.foundationalInformation,
      brandLanguage: mapped.brandLanguage,
      maxBlogDescriptionLength: mapped.maxBlogDescriptionLength,
      maxLinkedTrial: mapped.maxLinkedTrial,
      maxLinkedPoll: mapped.maxLinkedPoll,
      prioritySources: mapped.prioritySources,
      fallbackImageUrl: mapped.fallbackImageUrl,
      rewards: mapped.rewards,
      scheduleRules: mapped.scheduleRules,
    });
    setCountryOpts(mapped.countryOpts);
    setStateOpts(mapped.stateOpts);
    setCityOpts(mapped.cityOpts);
    setIndustryOpts(mapped.industryOpts);
    setLoadError(null);
  }, [open, agentId, fetchAndPopulate, reset]);

  useEffect(() => {
    if (rewardFields.length === 0) {
      appendReward({ assetId: coinAssets[0], amount: "", rewardAmountCap: "", rewardType: "max" });
    }
  }, [appendReward, rewardFields.length]);

  const stepIndex = INKD_CREATE_STEPS.findIndex((s) => s.id === activeStepId);
  const currentStepLabel = INKD_CREATE_STEPS[stepIndex]?.label ?? "";
  const isLastStep = stepIndex === INKD_CREATE_STEPS.length - 1;

  function hasStepErrors(step: InkdCreateStepId): boolean {
    if (step === "foundational") return !!(errors.foundationalInformation);
    if (step === "brand") return !!errors.brandLanguage;
    if (step === "settings")
      return !!(
        errors.maxBlogDescriptionLength ||
        errors.maxLinkedTrial ||
        errors.maxLinkedPoll ||
        errors.scheduleRules
      );
    if (step === "priority") return !!errors.prioritySources;
    if (step === "rewards") return !!errors.rewards;
    return false;
  }

  const canGoNext = !hasStepErrors(activeStepId) && !isSubmitting;

  const handleNext = () => {
    if (!canGoNext || isLastStep) return;
    const nextStep = INKD_CREATE_STEPS[stepIndex + 1]?.id;
    if (nextStep) setActiveStepId(nextStep);
  };

  const onSubmit = async (values: InkdAgentCreateFormValues) => {
    if (!agentId || !apiData) return;
    const payload = {
      foundationalInformation: values.foundationalInformation.trim(),
      brandLanguage: values.brandLanguage.trim(),
      minBlogTitleLength: apiData.minBlogTitleLength,
      maxBlogTitleLength: apiData.maxBlogTitleLength,
      minBlogDescriptionLength: apiData.minBlogDescriptionLength,
      maxBlogDescriptionLength: values.maxBlogDescriptionLength,
      maxLinkedTrial: values.maxLinkedTrial,
      maxLinkedPoll: values.maxLinkedPoll,
      prioritySources: values.prioritySources.map((s) => s.trim()).filter(Boolean),
      industryIds: industryOpts.map((i) => i.value),
      targetGeo:
        countryOpts.length || stateOpts.length || cityOpts.length
          ? {
              countries: countryOpts.map((c) => c.value).filter(Boolean),
              states: stateOpts.map((s) => s.value).filter(Boolean),
              cities: cityOpts.map((c) => c.value).filter(Boolean),
            }
          : null,
      fallbackImageUrl: values.fallbackImageUrl?.trim() || null,
      rewards: values.rewards.map((r) => ({
        assetId: r.assetId,
        amount: r.amount,
        rewardAmountCap: r.rewardAmountCap,
        rewardType: r.rewardType,
      })),
      scheduleRules: (values.scheduleRules ?? [])
        .map((r) =>
          localScheduleRuleToUtc({
            weekdays: (r.weekdays ?? []).map((d) => d.trim()).filter(Boolean) as any,
            timeUtc: r.timeUtc,
          }),
        )
        .filter((r) => r.weekdays.length && r.timeUtc),
    };
    try {
      const route = endpoints.entities.inkd.internalAgent.update(agentId);
      const { data } = await apiInstance.patch(`${BASE_URL}${route}`, payload);
      const updated = data?.data as InkdAgentApiDetail | undefined;
      if (updated) setEditCache(agentId, updated);
      onOpenChange(false);
    } catch {
      form.setError("root", { message: "Update failed" });
    }
  };

  const handleSaveChanges = handleSubmit(onSubmit);

  if (!agentId) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="max-h-[90vh] w-[95vw] max-w-4xl overflow-hidden bg-transparent p-0">
        <div className="flex h-[85vh] min-h-[500px] space-x-2">
          {/* Left vertical tabs */}
          <TooltipProvider delayDuration={200}>
            <nav className="flex w-14 flex-shrink-0 flex-col items-center justify-center gap-5 h-fit my-auto bg-white rounded-full py-4">
              {INKD_CREATE_STEPS.map((step) => {
                const isActive = activeStepId === step.id;
                const Icon = STEP_ICONS[step.id];
                return (
                  <Tooltip key={step.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setActiveStepId(step.id)}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg transition",
                          isActive
                            ? "bg-[#E8E8EC] text-[#111]"
                            : "text-[#9ca3af] hover:bg-[#E8E8EC] hover:text-[#111]",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8} className="bg-white text-[#111] border border-[#DDE2E5] shadow-md">
                      {step.label.replace(/\s/g, " ")}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </nav>
          </TooltipProvider>

          {/* Right content */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#F0F4F9] rounded-2xl">
            <AlertDialogHeader className="shrink-0 flex-row items-center justify-between border-b border-[#E6E7EB] px-6 py-4">
              <AlertDialogTitle className="text-lg font-semibold text-[#202020] uppercase">
                {currentStepLabel.replace(/\s/g, " ")}
              </AlertDialogTitle>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-full p-1.5 text-[#5E6366] hover:bg-[#f0f0f2]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </AlertDialogHeader>

            {loadError ? (
              <div className="flex flex-1 items-center justify-center px-6 py-10 text-[#5E6366]">
                {loadError}
              </div>
            ) : (
              <form
                className="flex min-h-0 flex-1 flex-col"
                noValidate
              >
                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                  <div className="mx-auto w-full max-w-3xl">
                    {activeStepId === "foundational" && (
                      <FoundationalInfoStep
                        form={form}
                        nameStatus="available"
                        editMode={apiData ? { name: apiData.name } : undefined}
                      />
                    )}
                    {activeStepId === "brand" && <BrandLanguageStep form={form} />}
                    {activeStepId === "settings" && (
                      <SettingsStep
                        form={form}
                        countryOpts={countryOpts}
                        setCountryOpts={setCountryOpts}
                        stateOpts={stateOpts}
                        setStateOpts={setStateOpts}
                        cityOpts={cityOpts}
                        setCityOpts={setCityOpts}
                        industryOpts={industryOpts}
                        setIndustryOpts={setIndustryOpts}
                      />
                    )}
                    {activeStepId === "priority" && (
                      <PriorityScrapingStep
                        form={form}
                        priorityFields={priorityFields}
                        append={append}
                        remove={remove}
                        move={move}
                      />
                    )}
                    {activeStepId === "rewards" && (
                      <RewardDistributionStep
                        form={form}
                        rewardFields={rewardFields}
                        appendReward={appendReward}
                        removeReward={removeReward}
                      />
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex justify-end border-t border-[#E6E7EB] bg-[#F0F4F9] px-6 pt-4 pb-5">
                  {isLastStep ? (
                    <Button
                      type="button"
                      onClick={() => {
                        void handleSaveChanges();
                      }}
                      disabled={!canGoNext || isSubmitting}
                      className="rounded-full bg-[#6b63f6] px-10 text-white hover:bg-[#574ee8] disabled:opacity-70"
                    >
                      Save changes
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={!canGoNext}
                      className="rounded-full bg-[#6b63f6] px-10 text-white hover:bg-[#574ee8] disabled:opacity-70"
                    >
                      Next
                    </Button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
