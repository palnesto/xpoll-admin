import { NumberField } from "@/components/commons/form/NumberField";
import { TextField } from "@/components/commons/form/TextField";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { appToast } from "@/utils/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import type {
  BuyConfigUpdateBody,
  BuyConfigFormValues,
  Limits,
  ManagedItem,
} from "../types";
import {
  createItemSchema,
  getErrorMessage,
  toFormDefaults,
  toMinorPreview,
  toUpdateBody,
} from "../utils";

type BuyConfigItemEditorProps = {
  item: ManagedItem;
  limits: Limits;
  isSaving: boolean;
  onSave: (item: ManagedItem, body: BuyConfigUpdateBody) => Promise<void>;
};

export function BuyConfigItemEditor({
  item,
  limits,
  isSaving,
  onSave,
}: BuyConfigItemEditorProps) {
  const isAsset = item.entityType === "asset";
  const [serverError, setServerError] = useState("");

  const schema = useMemo(
    () => createItemSchema(limits, isAsset),
    [isAsset, limits],
  );
  const defaultValues = useMemo(() => toFormDefaults(item, limits), [item, limits]);

  const form = useForm<BuyConfigFormValues>({
    mode: "onBlur",
    reValidateMode: "onChange",
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
    setServerError("");
  }, [defaultValues, form]);

  const usdMajor = useWatch({ control: form.control, name: "usdMajor" }) ?? "";
  const usdcMajor =
    useWatch({ control: form.control, name: "usdcMajor" }) ?? "";

  const onSubmit = async (values: BuyConfigFormValues) => {
    setServerError("");
    try {
      const body = toUpdateBody(item, values, limits);
      await onSave(item, body);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      setServerError(message);
      appToast.error(message);
    }
  };

  const onReset = () => {
    form.reset(defaultValues);
    setServerError("");
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError ? <p className="text-xs text-red-400">{serverError}</p> : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3 space-y-3">
          <div className="text-xs uppercase tracking-wide text-zinc-400">
            Global
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Global Buy Enable</span>
            <Controller
              control={form.control}
              name="enable"
              render={({ field }) => (
                <Switch
                  checked={field.value === true}
                  onCheckedChange={(checked) => field.onChange(checked)}
                />
              )}
            />
          </div>

          <p className="text-xs text-zinc-400">
            Main on/off for buying this item. If this is off, users cannot
            purchase it.
          </p>

          {isAsset ? (
            <NumberField<BuyConfigFormValues>
              form={form}
              schema={schema}
              name="minParentTokensPerOrder"
              label="Min Parent Tokens Per Order"
              placeholder={`1 - ${limits.maxParentTokensPerOrder}`}
              decimalScale={0}
              helperText={`Minimum tokens a user must buy in one order. Use whole numbers from 1 to ${limits.maxParentTokensPerOrder}.`}
              showError
            />
          ) : null}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3 space-y-3">
          <div className="text-xs uppercase tracking-wide text-zinc-400">
            Fiat
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Fiat Rail</span>
            <Controller
              control={form.control}
              name="fiatEnable"
              render={({ field }) => (
                <Switch
                  checked={field.value === true}
                  onCheckedChange={(checked) => field.onChange(checked)}
                />
              )}
            />
          </div>

          <p className="text-xs text-zinc-400">
            Turns on fiat payment support for this item.
          </p>

          <div className="flex items-center justify-between">
            <span className="text-sm">USD Price Enable</span>
            <Controller
              control={form.control}
              name="usdEnable"
              render={({ field }) => (
                <Switch
                  checked={field.value === true}
                  onCheckedChange={(checked) => field.onChange(checked)}
                />
              )}
            />
          </div>

          <p className="text-xs text-zinc-400">
            Allows checkout in USD when USD payments are enabled.
          </p>

          <TextField<BuyConfigFormValues>
            form={form}
            schema={schema}
            name="usdMajor"
            label="USD Price"
            placeholder={`<= ${limits.maxUsdMajor}`}
            helperText={`Enter the price in USD. Example: 1 means one dollar. Decimals are allowed (like 99.99). Max allowed is ${limits.maxUsdMajor}.`}
            showError
          />

          {toMinorPreview(usdMajor, limits.usdMinorScale) ? (
            <p className="text-[11px] text-zinc-500">
              Stored automatically in system units as{" "}
              {toMinorPreview(usdMajor, limits.usdMinorScale)}.
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-3 space-y-3">
          <div className="text-xs uppercase tracking-wide text-zinc-400">
            Crypto
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Crypto Rail</span>
            <Controller
              control={form.control}
              name="cryptoEnable"
              render={({ field }) => (
                <Switch
                  checked={field.value === true}
                  onCheckedChange={(checked) => field.onChange(checked)}
                />
              )}
            />
          </div>

          <p className="text-xs text-zinc-400">
            Turns on crypto payment support for this item.
          </p>

          <div className="flex items-center justify-between">
            <span className="text-sm">USDC Price Enable</span>
            <Controller
              control={form.control}
              name="usdcEnable"
              render={({ field }) => (
                <Switch
                  checked={field.value === true}
                  onCheckedChange={(checked) => field.onChange(checked)}
                />
              )}
            />
          </div>

          <p className="text-xs text-zinc-400">
            Allows checkout in USDC when USDC payments are enabled.
          </p>

          <TextField<BuyConfigFormValues>
            form={form}
            schema={schema}
            name="usdcMajor"
            label="USDC Price"
            placeholder={`<= ${limits.maxUsdcMajor}`}
            helperText={`Enter the price in USDC. Example: 1 means one USDC. Decimals are allowed (like 149.5). Max allowed is ${limits.maxUsdcMajor}.`}
            showError
          />

          {toMinorPreview(usdcMajor, limits.usdcMinorScale) ? (
            <p className="text-[11px] text-zinc-500">
              Stored automatically in system units as{" "}
              {toMinorPreview(usdcMajor, limits.usdcMinorScale)}.
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <Button variant="outline" type="button" onClick={onReset} disabled={isSaving}>
          Reset
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
