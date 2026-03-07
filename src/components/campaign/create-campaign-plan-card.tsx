import { motion, AnimatePresence } from "motion/react";
import { Zap, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatMoneyFromMinor } from "@/utils/currency-plans";
import type { CampaignPlan } from "@/components/campaign/types";
import type { AdminCreateCampaignFormValues } from "@/schema/admin-campaign.schema";

export type CreateCampaignPlanCardProps = {
  form: ReturnType<typeof import("react-hook-form").useForm<AdminCreateCampaignFormValues>>;
  filteredPlans: CampaignPlan[];
  plansLoading: boolean;
  plansError: unknown;
  getPlanId: (p: CampaignPlan) => string;
  onContinue: () => void;
  isValid: boolean;
  isBusy: boolean;
};

export function CreateCampaignPlanCard({
  form,
  filteredPlans,
  plansLoading,
  plansError,
  getPlanId,
  onContinue,
  isValid,
  isBusy,
}: CreateCampaignPlanCardProps) {
  const { setValue } = form;
  const duration = form.watch("duration");
  const durationError = form.formState.errors.duration;

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.4,
        delay: 0.15,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
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

          {!plansLoading && !plansError && filteredPlans.length === 0 && (
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
                const priceObj =
                  plan.prices?.find((p) => p.currency === "USD") ??
                  plan.prices?.[0];
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
                                transition={{
                                  type: "spring",
                                  stiffness: 400,
                                  damping: 20,
                                }}
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
                              active
                                ? "text-foreground"
                                : "text-muted-foreground"
                            )}
                          >
                            {plan.name}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "text-lg font-semibold shrink-0",
                            active
                              ? "text-foreground"
                              : "text-muted-foreground"
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

          {durationError && (
            <p className="text-xs text-destructive">
              {durationError.message}
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
          onClick={onContinue}
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
  );
}
