import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdminCampaignConfirmModal } from "@/components/modals/campaign/admin-campaign-confirm-modal";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { endpoints } from "@/api/endpoints";
import { appToast } from "@/utils/toast";
import {
  pickDisplayPrice,
  CreateCampaignSetupCard,
  CreateCampaignPlanCard,
} from "@/components/campaign";
import {
  adminCreateCampaignFormZ,
  type AdminCreateCampaignFormValues,
} from "@/schema/admin-campaign.schema";
import { formatMoneyFromMinor } from "@/utils/currency-plans";
import type { CampaignPlan } from "@/components/campaign/types";

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
      navigate("/campaign");
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
        <CreateCampaignSetupCard
          form={form}
          selectedUserLabel={selectedUserLabel}
          onSelectedUserLabelChange={setSelectedUserLabel}
        />

        <CreateCampaignPlanCard
          form={form}
          filteredPlans={filteredPlans}
          plansLoading={plansLoading}
          plansError={plansError}
          getPlanId={getPlanId}
          onContinue={openConfirm}
          isValid={isValid}
          isBusy={isBusy}
        />
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
