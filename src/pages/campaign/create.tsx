import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, User, Target, Zap, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

import { TextField } from "@/components/commons/form/TextField";
import { TextAreaField } from "@/components/commons/form/TextAreaField";

import { ExternalAccountSelect } from "@/components/commons/selects/external-accounts";

import { AdminCampaignConfirmModal } from "@/components/modals/campaign/admin-campaign-confirm-modal";

import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { endpoints } from "@/api/endpoints";
import { appToast } from "@/utils/toast";
import { formatMoneyFromMinor } from "@/utils/currency-plans";

import {
  adminCreateCampaignFormZ,
  type AdminCreateCampaignFormValues,
} from "@/schema/admin-campaign.schema";
import { cn } from "@/lib/utils";

type CampaignPlan = {
  _id: string;
  id?: string;
  name: string;
  durationDays: number;
  isPolitical: boolean;
  donationSupported: boolean;
  isActive?: boolean;
  archivedAt?: string | null;
  prices?: { amountMinor: number; currency: string }[];
};

function pickDisplayPrice(
  plan: CampaignPlan | undefined,
  preferredCurrency = "USD"
) {
  if (!plan?.prices?.length) return null;
  return (
    plan.prices.find((p) => p.currency === preferredCurrency) ?? plan.prices[0]
  );
}

const defaultValues: AdminCreateCampaignFormValues = {
  externalAccountId: "",
  campaignName: "",
  goal: "",
  getDataAccess: false,
  campaignType: "non_political",
  duration: "",
  agree: false,
};

export default function CreateCampaignPage() {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submittedSnapshot, setSubmittedSnapshot] =
    useState<AdminCreateCampaignFormValues | null>(null);
  const [selectedUserLabel, setSelectedUserLabel] = useState<string>("");

  const form = useForm<AdminCreateCampaignFormValues>({
    mode: "onChange",
    resolver: zodResolver(adminCreateCampaignFormZ),
    defaultValues,
  });

  const { watch, setValue, trigger, register, formState } = form;
  const { errors, isValid, isSubmitting } = formState;

  const getDataAccess = watch("getDataAccess");
  const campaignType = watch("campaignType");
  const duration = watch("duration");
  const agree = watch("agree");

  const isPolitical = campaignType === "political";

  const { data: plansRes, isLoading: plansLoading, error: plansError } =
    useApiQuery(endpoints.entities.campaigns.plans);

  const allPlans =
    (plansRes as any)?.data?.data ??
    (plansRes as any)?.data?.entries ??
    (plansRes as any)?.data ??
    [];

  const filteredPlans = useMemo(() => {
    return (allPlans as CampaignPlan[])
      .filter((p) => p.isActive !== false)
      .filter((p) => p.archivedAt == null)
      .filter((p) => p.isPolitical === isPolitical)
      .filter((p) => p.donationSupported === getDataAccess)
      .sort((a, b) => a.durationDays - b.durationDays);
  }, [allPlans, isPolitical, getDataAccess]);

  const getPlanId = (p: CampaignPlan) => p.id ?? p._id;

  useEffect(() => {
    if (!filteredPlans.length) return;
    const stillValid = filteredPlans.some((p) => (p.id ?? p._id) === duration);
    if (!stillValid) {
      setValue("duration", filteredPlans[0].id ?? filteredPlans[0]._id, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [filteredPlans, duration, setValue]);

  const selectedPlan = useMemo(
    () => filteredPlans.find((p) => getPlanId(p) === duration),
    [filteredPlans, duration]
  );

  const selectedPriceObj = useMemo(
    () => pickDisplayPrice(selectedPlan, "USD"),
    [selectedPlan]
  );

  const selectedPriceDisplay = useMemo(() => {
    if (!selectedPriceObj) return "";
    return formatMoneyFromMinor(
      selectedPriceObj.amountMinor,
      selectedPriceObj.currency
    );
  }, [selectedPriceObj]);

  const { mutateAsync: createCampaign, isPending: isCreating } = useApiMutation<
    {
      externalAuthor: string;
      name: string;
      goal: string;
      isPolitical: boolean;
      initialPlanId: string;
    },
    unknown
  >({
    route: endpoints.entities.campaigns.create,
    method: "POST",
    onSuccess: () => {
      appToast.success("Campaign created successfully");
      setConfirmOpen(false);
      setSubmittedSnapshot(null);
      form.reset(defaultValues);
      setSelectedUserLabel("");
    },
  });

  const openConfirm = async () => {
    const ok = await trigger([
      "externalAccountId",
      "campaignName",
      "goal",
      "campaignType",
      "duration",
    ]);
    if (!ok) return;

    setSubmittedSnapshot({
      ...watch(),
      agree: false,
    });
    setValue("agree", false, { shouldDirty: true });
    setConfirmOpen(true);
  };

  const handleCreate = async () => {
    const ok = await trigger(["agree"]);
    if (!ok) return;

    const data = submittedSnapshot ?? watch();
    if (!data.externalAccountId) {
      appToast.error("Please select a user");
      return;
    }

    const payload = {
      externalAuthor: data.externalAccountId,
      name: data.campaignName,
      goal: data.goal,
      isPolitical: data.campaignType === "political",
      initialPlanId: data.duration,
    };
    await createCampaign(payload);
  };

  const isBusy = isSubmitting || isCreating;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="min-h-screen p-6 md:p-8 lg:p-10 w-full max-w-6xl mx-auto relative before:absolute before:inset-0 before:bg-gradient-to-br before:from-background before:via-background before:to-primary/5 before:-z-10"
    >
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0 rounded-xl border-2 hover:bg-muted"
            aria-label="Back"
            title="Back"
            disabled={isBusy}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">
              Create Campaign
            </h1>
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              Create a campaign for any user by selecting them below
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={(e) => e.preventDefault()}
        noValidate
        className="flex flex-col lg:flex-row gap-6"
      >
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex-1"
        >
        <Card className="rounded-2xl border-2 shadow-lg overflow-hidden bg-gradient-to-br from-card to-card/80">
          <CardHeader className="pb-4 border-b bg-gradient-to-r from-muted/40 to-muted/20">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
                    <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">
                  Set-up Campaign
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select user, name, goal, and campaign type
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2 [&_.my-dropdown__single-value]:!text-white [&_.my-dropdown__value-container]:!text-white">
              <label className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4 text-muted-foreground" />
                Select User
                <span className="text-red-600">*</span>
              </label>
              <Controller
                control={form.control}
                name="externalAccountId"
                render={({ field }) => (
                  <ExternalAccountSelect
                    theme="dark"
                    onChange={(opt) => {
                      field.onChange(opt?.value ?? "");
                      setSelectedUserLabel(opt?.label ?? "");
                    }}
                    placeholder="Search user..."
                    selectProps={{
                      menuPortalTarget: document.body,
                      menuPosition: "fixed",
                      value: field.value
                        ? {
                            value: field.value,
                            label: selectedUserLabel || field.value,
                          }
                        : null,
                    }}
                  />
                )}
              />
              {errors.externalAccountId && (
                <p className="text-xs text-destructive">
                  {errors.externalAccountId.message}
                </p>
              )}
            </div>

            <TextField<AdminCreateCampaignFormValues>
              form={form}
              schema={adminCreateCampaignFormZ}
              name="campaignName"
              label="Campaign name"
              placeholder="Rhode Island's Next Chapter..."
              showError
              showCounter
            />

            <TextAreaField<AdminCreateCampaignFormValues>
              form={form}
              schema={adminCreateCampaignFormZ}
              name="goal"
              label="Goal of Campaign"
              placeholder="Understand Rhode Islanders' top concerns..."
              rows={4}
              helperText="Max 500 characters"
              showError
              showCounter
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  Get Data Access
                </label>
                <div className="flex items-center justify-between rounded-xl border-2 border-border bg-gradient-to-r from-muted/30 to-muted/10 px-4 py-3.5 transition-colors hover:border-primary/30 hover:bg-primary/5">
                  <span className="text-sm font-medium">
                    {getDataAccess ? "Yes" : "No"}
                  </span>
                  <Switch
                    checked={getDataAccess}
                    onCheckedChange={(v) =>
                      setValue("getDataAccess", v, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    aria-label="Get Data Access"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Type of campaign
                  <span className="ml-1 text-red-600">*</span>
                </label>
                <div className="flex gap-6 rounded-xl border-2 border-border bg-gradient-to-r from-muted/30 to-muted/10 px-4 py-3.5 transition-colors hover:border-primary/30 hover:bg-primary/5">
                  <label className="flex items-center gap-2.5 text-sm cursor-pointer font-medium">
                    <input
                      type="radio"
                      value="political"
                      className="h-4 w-4 accent-primary"
                      {...form.register("campaignType")}
                    />
                    Political
                  </label>
                  <label className="flex items-center gap-2.5 text-sm cursor-pointer font-medium">
                    <input
                      type="radio"
                      value="non_political"
                      className="h-4 w-4 accent-primary"
                      {...form.register("campaignType")}
                    />
                    non-Political
                  </label>
                </div>
                {errors.campaignType && (
                  <p className="text-xs text-destructive">
                    {errors.campaignType.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="lg:w-[400px] shrink-0 space-y-5"
        >
          <Card className="rounded-2xl border-2 shadow-lg overflow-hidden bg-gradient-to-br from-card to-card/80">
            <CardHeader className="pb-4 border-b bg-gradient-to-r from-muted/40 to-muted/20">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">
                    Select Plan
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Choose a plan based on campaign type and data access
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {plansLoading && (
                <div className="py-6 text-sm text-muted-foreground text-center">
                  Loading plans...
                </div>
              )}

              {plansError && (
                <div className="py-6 text-sm text-destructive text-center">
                  Failed to load plans.
                </div>
              )}

              {!plansLoading &&
                !plansError &&
                filteredPlans.length === 0 && (
                  <div className="py-6 text-sm text-muted-foreground text-center">
                    No plans available for this selection.
                  </div>
                )}

              <AnimatePresence mode="wait">
              {!plansLoading &&
                !plansError &&
                filteredPlans.map((plan, idx) => {
                  const planId = getPlanId(plan);
                  const active = duration === planId;
                  const priceObj = pickDisplayPrice(plan, "USD");
                  const priceLabel = priceObj
                    ? formatMoneyFromMinor(
                        priceObj.amountMinor,
                        priceObj.currency
                      )
                    : "--";

                  return (
                    <motion.div
                      key={plan._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.3,
                        delay: idx * 0.05,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setValue("duration", planId, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                        className={cn(
                          "w-full rounded-xl border-2 px-5 py-5 text-left transition-all duration-300",
                          active
                            ? "border-primary bg-gradient-to-r from-primary/15 to-primary/5 shadow-md shadow-primary/20 ring-2 ring-primary/20"
                            : "border-border bg-gradient-to-r from-card to-muted/20 hover:border-primary/50 hover:bg-primary/5"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors",
                                active
                                  ? "bg-primary"
                                  : "border-2 border-muted-foreground/30 bg-background"
                              )}
                            >
                              {active && (
                                <motion.svg
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  className="text-primary-foreground"
                                >
                                  <path
                                    d="M20 6L9 17l-5-5"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </motion.svg>
                              )}
                            </div>
                            <span
                              className={cn(
                                "font-medium truncate",
                                active ? "text-foreground" : "text-muted-foreground"
                              )}
                            >
                              {plan.name}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "text-lg font-semibold shrink-0",
                              active ? "text-foreground" : "text-muted-foreground"
                            )}
                          >
                            {priceLabel}
                          </span>
                        </div>
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {errors.duration && (
                <p className="text-xs text-destructive">
                  {errors.duration.message}
                </p>
              )}
            </CardContent>
          </Card>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <Button
              type="button"
              onClick={openConfirm}
              disabled={!isValid || isBusy}
              className={cn(
                "w-full py-4 rounded-xl text-base font-semibold transition-all flex items-center justify-center gap-2",
                isValid && !isBusy
                  ? "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/95 hover:to-primary/70 hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98]"
                  : "opacity-60 cursor-not-allowed"
              )}
            >
              Continue
              <ChevronRight className="h-5 w-5" />
            </Button>
          </motion.div>
        </motion.div>
      </form>

      <AdminCampaignConfirmModal
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setSubmittedSnapshot(null);
          setValue("agree", false, { shouldDirty: true });
        }}
        snapshot={submittedSnapshot}
        selectedPlanName={selectedPlan?.name}
        selectedPlanPriceLabel={selectedPriceDisplay}
        selectedUserName={selectedUserLabel || undefined}
        register={register}
        errors={errors}
        agree={!!agree}
        onCreate={handleCreate}
        isCreating={isCreating}
      />
    </motion.div>
  );
}
