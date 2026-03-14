import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useFieldArray, useForm } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useAdminAuth } from "@/hooks/useAdminAuth";
import apiInstance, { BASE_URL } from "@/api/queryClient";
import { endpoints } from "@/api/endpoints";
import { coinAssets } from "@/utils/currency-assets/asset";
import {
  inkdAgentCreateFormSchema,
  INKD_CREATE_TAB_PARAMS,
  TAB_PARAM_TO_STEP_ID,
  STEP_ID_TO_TAB_PARAM,
  INKD_CREATE_STEPS,
  type InkdAgentCreateFormValues,
  type InkdCreateStepId,
} from "@/schema/inkd-agent-create.schema";
import {
  DEFAULT_INKD_AGENT_CREATE_DATA,
  useInkdAgentCreateStore,
  type InkdAgentRewardInput,
} from "@/stores/inkdAgentCreate.store";
import {
  readPersistedForm,
  writePersistedForm,
  clearPersistedForm,
} from "@/stores/inkdAgentCreate.persistence";
import { CreateAgentTabs } from "@/components/inkd/create-agent-tabs";
import { CreateAgentFooter } from "@/components/inkd/create-agent-footer";
import {
  FoundationalInfoStep,
  type NameStatus,
} from "@/components/inkd/foundational-info-step";
import { BrandLanguageStep } from "@/components/inkd/brand-language-step";
import {
  SettingsStep,
  type GeoOption,
  type IndustryOption,
} from "@/components/inkd/settings-step";
import { PriorityScrapingStep } from "@/components/inkd/priority-scraping-step";
import { RewardDistributionStep } from "@/components/inkd/reward-distribution-step";

export default function CreateInkdInternalAgent() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAdminAuth();
  const userId = user?.id;

  const { data: storeData, setData: setStoreData, reset: resetStore } =
    useInkdAgentCreateStore();

  const tabParam = searchParams.get("tab");
  const activeStepId = useMemo((): InkdCreateStepId => {
    if (tabParam && INKD_CREATE_TAB_PARAMS.includes(tabParam as any)) {
      return TAB_PARAM_TO_STEP_ID[tabParam as keyof typeof TAB_PARAM_TO_STEP_ID];
    }
    return "foundational";
  }, [tabParam]);

  const [nameStatus, setNameStatus] = useState<NameStatus>("idle");
  const [countryOpts, setCountryOpts] = useState<GeoOption[]>([]);
  const [stateOpts, setStateOpts] = useState<GeoOption[]>([]);
  const [cityOpts, setCityOpts] = useState<GeoOption[]>([]);
  const [industryOpts, setIndustryOpts] = useState<IndustryOption[]>([]);

  const defaultValues: InkdAgentCreateFormValues = useMemo(() => {
    const persisted = readPersistedForm(userId).data;
    const base = {
      name: DEFAULT_INKD_AGENT_CREATE_DATA.name,
      foundationalInformation:
        DEFAULT_INKD_AGENT_CREATE_DATA.foundationalInformation,
      brandLanguage: DEFAULT_INKD_AGENT_CREATE_DATA.brandLanguage,
      maxBlogDescriptionLength:
        DEFAULT_INKD_AGENT_CREATE_DATA.maxBlogDescriptionLength,
      maxLinkedTrial: DEFAULT_INKD_AGENT_CREATE_DATA.maxLinkedTrial,
      maxLinkedPoll: DEFAULT_INKD_AGENT_CREATE_DATA.maxLinkedPoll,
      prioritySources: DEFAULT_INKD_AGENT_CREATE_DATA.prioritySources,
      fallbackImageUrl: DEFAULT_INKD_AGENT_CREATE_DATA.fallbackImageUrl,
      rewards:
        (DEFAULT_INKD_AGENT_CREATE_DATA.rewards as InkdAgentRewardInput[]) ?? [],
    };
    return { ...base, ...storeData, ...persisted } as InkdAgentCreateFormValues;
  }, [storeData, userId]);

  const form = useForm<InkdAgentCreateFormValues>({
    mode: "onChange",
    resolver: zodResolver(inkdAgentCreateFormSchema),
    defaultValues,
  });

  const {
    control,
    watch,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = form;

  // Two useFieldArray hooks: TS infers the second array for both; we assert the first result.
  // @ts-expect-error RHF infers a single array name when multiple useFieldArray are used
  const prioritySourcesFieldArray = useFieldArray({ control, name: "prioritySources" });
  const priorityFields = prioritySourcesFieldArray.fields as unknown as Array<{ id: string }>;
  const append = prioritySourcesFieldArray.append as unknown as (value: string) => void;
  const { remove, move } = prioritySourcesFieldArray;

  const { fields: rewardFields, append: appendReward, remove: removeReward } =
    useFieldArray<InkdAgentCreateFormValues, "rewards", "id">({
      control,
      name: "rewards",
    });

  function setStepToUrl(stepId: InkdCreateStepId) {
    setSearchParams({ tab: STEP_ID_TO_TAB_PARAM[stepId] }, { replace: true });
  }

  useEffect(() => {
    const persisted = readPersistedForm(userId);
    if (Array.isArray(persisted.countryOpts)) setCountryOpts(persisted.countryOpts as GeoOption[]);
    if (Array.isArray(persisted.stateOpts)) setStateOpts(persisted.stateOpts as GeoOption[]);
    if (Array.isArray(persisted.cityOpts)) setCityOpts(persisted.cityOpts as GeoOption[]);
    if (Array.isArray(persisted.industryOpts)) setIndustryOpts(persisted.industryOpts as IndustryOption[]);
  }, [userId]);

  useEffect(() => {
    const subscription = watch((value) => {
      const safe = value as InkdAgentCreateFormValues;
      setStoreData(safe);
      writePersistedForm(userId, safe, {
        countryOpts,
        stateOpts,
        cityOpts,
        industryOpts,
      });
    });
    return () => subscription.unsubscribe();
  }, [watch, setStoreData, userId, countryOpts, stateOpts, cityOpts, industryOpts]);

  useEffect(() => {
    if (rewardFields.length === 0) {
      appendReward({
        assetId: coinAssets[0],
        amount: "",
        rewardAmountCap: "",
        rewardType: "max",
      });
    }
  }, [appendReward, rewardFields.length]);

  const name = watch("name");
  useEffect(() => {
    const trimmed = name?.trim() ?? "";
    if (!trimmed || trimmed.length < 3) {
      setNameStatus("idle");
      return;
    }
    setNameStatus("checking");
    const t = window.setTimeout(async () => {
      try {
        const route =
          endpoints.entities.inkd.internalAgent.checkNameAvailability(trimmed);
        const { data } = await apiInstance.get(`${BASE_URL}${route}`);
        const available = !!data?.data?.available;
        setNameStatus(available ? "available" : "unavailable");
        if (!available) {
          setError("name", { type: "manual", message: "This name is already taken" });
        } else {
          clearErrors("name");
        }
      } catch {
        setNameStatus("error");
      }
    }, 500);
    return () => window.clearTimeout(t);
  }, [name, setError, clearErrors]);

  const stepIndex = INKD_CREATE_STEPS.findIndex((s) => s.id === activeStepId);

  function hasStepErrors(step: InkdCreateStepId, errs: FieldErrors<InkdAgentCreateFormValues>): boolean {
    if (step === "foundational") return !!(errs.name || errs.foundationalInformation);
    if (step === "brand") return !!errs.brandLanguage;
    if (step === "settings") return !!(
      errs.maxBlogDescriptionLength || errs.maxLinkedTrial || errs.maxLinkedPoll
    );
    if (step === "priority") return !!errs.prioritySources;
    if (step === "rewards") return !!errs.rewards;
    return false;
  }

  const canGoNext =
    !isSubmitting &&
    !hasStepErrors(activeStepId, errors) &&
    (activeStepId !== "foundational" ? true : nameStatus === "available");

  const onSubmit = async (values: InkdAgentCreateFormValues) => {
    const payload = {
      name: values.name.trim(),
      foundationalInformation: values.foundationalInformation.trim(),
      brandLanguage: values.brandLanguage.trim(),
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
      fallbackImageUrl: values.fallbackImageUrl?.trim() || undefined,
      rewards: values.rewards.map((r) => ({
        assetId: r.assetId,
        amount: r.amount,
        rewardAmountCap: r.rewardAmountCap,
        rewardType: r.rewardType,
      })),
    };

    const { data } = await apiInstance.post(
      `${BASE_URL}${endpoints.entities.inkd.internalAgent.create}`,
      payload,
    );

    clearPersistedForm(userId);
    resetStore();
    reset(DEFAULT_INKD_AGENT_CREATE_DATA as unknown as InkdAgentCreateFormValues);

    const created = data?.data;
    if (created?.internalAgentId) {
      navigate("/inkd");
    }
  };

  const goNext = async () => {
    if (!canGoNext) return;
    if (stepIndex === INKD_CREATE_STEPS.length - 1) {
      await handleSubmit(onSubmit)();
      return;
    }
    const nextStep = INKD_CREATE_STEPS[stepIndex + 1].id;
    setStepToUrl(nextStep);
  };

  const goBack = () => {
    if (stepIndex === 0) return;
    const prevStep = INKD_CREATE_STEPS[stepIndex - 1].id;
    setStepToUrl(prevStep);
  };

  const handleTabClick = (stepId: InkdCreateStepId) => {
    setStepToUrl(stepId);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] px-10 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 border-b border-[#E6E7EB] pb-4">
          <div className="text-sm font-medium tracking-[0.25em] text-[#999]">
            CREATING SIGNAL AI :
          </div>
        </div>

        <CreateAgentTabs
          activeStepId={activeStepId}
          stepIndex={stepIndex}
          onStepClick={handleTabClick}
        />

        <form className="space-y-10" noValidate>
          {activeStepId === "foundational" && (
            <FoundationalInfoStep form={form} nameStatus={nameStatus} />
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
        </form>

        <CreateAgentFooter
          stepIndex={stepIndex}
          isSubmitting={isSubmitting}
          canGoNext={canGoNext}
          onBack={goBack}
          onNext={goNext}
          validationError={
            activeStepId === "foundational" &&
            nameStatus !== "available" &&
            (nameStatus === "unavailable" ||
              nameStatus === "error" ||
              !(name?.trim() ?? ""))
              ? "Add name to continue"
              : undefined
          }
        />
      </div>
    </div>
  );
}
