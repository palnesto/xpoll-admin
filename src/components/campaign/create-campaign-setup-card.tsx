import { Controller } from "react-hook-form";
import { motion } from "motion/react";
import { User, Target, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { TextField } from "@/components/commons/form/TextField";
import { TextAreaField } from "@/components/commons/form/TextAreaField";
import { ExternalAccountSelect } from "@/components/commons/selects/external-accounts";
import {
  adminCreateCampaignFormZ,
  type AdminCreateCampaignFormValues,
} from "@/schema/admin-campaign.schema";

export type CreateCampaignSetupCardProps = {
  form: ReturnType<typeof import("react-hook-form").useForm<AdminCreateCampaignFormValues>>;
  selectedUserLabel: string;
  onSelectedUserLabelChange: (label: string) => void;
};

export function CreateCampaignSetupCard({
  form,
  selectedUserLabel,
  onSelectedUserLabelChange,
}: CreateCampaignSetupCardProps) {
  const { setValue, formState } = form;
  const { errors } = formState;
  const getDataAccess = form.watch("getDataAccess");

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.4,
        delay: 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
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
          <div className="space-y-2 [&_.my-dropdown__single-value]:!text-white [&_.my-dropdown__value-container]:!text-white [&_.my-dropdown__input]:!text-white">
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
                    onSelectedUserLabelChange(opt?.label ?? "");
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
            helperText="Min 3, max 40 characters"
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
            helperText="Min 10, max 150 characters"
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
  );
}
