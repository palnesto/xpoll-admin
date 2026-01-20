import { useCallback, useMemo, useState, useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider, Controller } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { endpoints } from "@/api/endpoints";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";

import {
  assetEnum,
  assetSpecs,
  AssetType,
} from "@/utils/currency-assets/asset";
import { amount, unwrapString } from "@/utils/currency-assets/base";
import { AssetLabel } from "@/pages/asset-ledger/system-report";

type Asset = { _id: string; name: string; symbol: string; parent?: string };

const SYSTEM_ACCOUNTS = [
  { label: "Exchange", value: "bbbbbbbbbbbbbbbbbbbbbbbb" },
  { label: "Poll Funds", value: "cccccccccccccccccccccccc" },
] as const;

const FALLBACK_ASSETS: Asset[] = [
  { _id: "xPoll", symbol: "XPL", name: "XPOLL" },
  { _id: "xOcta", symbol: "XOT", name: "xOCTA" },
  { _id: "xMYST", symbol: "XMT", name: "XMYST" },
  { _id: "xDrop", symbol: "XDP", name: "XDROP" },
  { _id: "xHigh", symbol: "XHG", name: "XHIGH" },
] as const;

const baseActionSchema = z.object({
  assetId: assetEnum,
  amount: z.coerce.number().int().min(1, "Min 1"),
});

const fundWithdrawSchema = baseActionSchema.extend({
  systemAccountId: z.enum(
    SYSTEM_ACCOUNTS.map((s) => s.value) as [string, ...string[]],
    {
      required_error: "Select a system account",
    },
  ),
});

type MintBurnValues = z.infer<typeof baseActionSchema>;
type FundWithdrawValues = z.infer<typeof fundWithdrawSchema>;

function baseToParent(
  assetId: AssetType,
  baseVal: string | number,
  fixed?: number,
) {
  const useFixed = typeof fixed === "number";
  return unwrapString(
    amount({
      op: "toParent",
      assetId,
      value: String(baseVal),
      output: "string",
      trim: useFixed ? false : true,
      fixed: useFixed ? Math.max(0, fixed) : undefined,
      group: false,
    }),
    "0",
  );
}

function parentToBaseNumber(assetId: AssetType, parentStr: string) {
  const n = amount({
    op: "toBase",
    assetId,
    value: parentStr,
    output: "number",
    allowUnsafeNumber: true,
  });
  return n.ok ? n.value : NaN;
}

function clampParentInput(
  assetId: AssetType,
  raw: string,
): { text: string; err: string } {
  const decimalsAllowed = Math.min(assetSpecs[assetId].decimal, 5);
  const MAX_INT = 9;

  const s = (raw ?? "").replace(/[^\d.]/g, "");
  if (s === "") return { text: "", err: "" };

  const parts = s.split(".");
  const iRaw = parts[0] ?? "";
  const fRawCombined = parts.slice(1).join("");
  const hasDotInRaw = s.includes(".");
  const trailingDot = hasDotInRaw && raw[raw.length - 1] === ".";

  let i = iRaw;
  let uiErr = "";
  if (i.length > MAX_INT) {
    i = i.slice(0, MAX_INT);
    uiErr = `Max ${MAX_INT} integer digits`;
  }

  let f = fRawCombined;
  if (decimalsAllowed === 0) {
    f = "";
  } else if (f.length > decimalsAllowed) {
    f = f.slice(0, decimalsAllowed);
    uiErr = uiErr
      ? `${uiErr}; max ${decimalsAllowed} decimal places`
      : `Max ${decimalsAllowed} decimal places`;
  }

  if (i === "" && (hasDotInRaw || trailingDot)) i = "0";

  let display = i;
  if (decimalsAllowed > 0) {
    if (trailingDot && f.length === 0) display = `${i}.`;
    else if (f.length > 0) display = `${i}.${f}`;
  }

  return { text: display, err: uiErr };
}

function limitsHint(assetId: AssetType): {
  maxInt: number;
  maxFrac: number;
  minStep: string;
} {
  const maxInt = 9;
  const maxFrac = Math.min(assetSpecs[assetId].decimal, 5);
  const minStep = maxFrac === 0 ? "1" : `0.${"0".repeat(maxFrac - 1)}1`;
  return { maxInt, maxFrac, minStep };
}

function useClampedParentInput(params: {
  assetId: AssetType;
  baseValue: string | number | "";
  onBaseChange: (nextBase: string) => void;
}) {
  const { assetId, baseValue, onBaseChange } = params;

  const [text, setText] = useState<string>(() =>
    Number(baseValue || 0) > 0 ? baseToParent(assetId, baseValue) : "",
  );
  const [uiErr, setUiErr] = useState<string>("");

  useEffect(() => {
    const baseNum = Number(baseValue || 0);
    const pretty = baseNum > 0 ? baseToParent(assetId, baseNum) : "";
    const clamped = clampParentInput(assetId, pretty);
    setText(clamped.text);
    setUiErr(clamped.err);
  }, [assetId, baseValue]);

  const onChange = (raw: string) => {
    const clamped = clampParentInput(assetId, raw);
    setText(clamped.text);
    setUiErr(clamped.err);

    const base = parentToBaseNumber(assetId, clamped.text);
    if (Number.isFinite(base)) {
      onBaseChange(String(base));
    }
  };

  const onBlur = () => {
    const s = (text ?? "").trim();
    if (s === "") {
      setText("");
      setUiErr("");
      onBaseChange("");
      return;
    }
    const clamped = clampParentInput(assetId, s);
    const base = parentToBaseNumber(assetId, clamped.text);

    if (Number.isFinite(base) && base > 0) {
      const pretty = baseToParent(assetId, base); // trimmed zeros
      const final = clampParentInput(assetId, pretty);
      setText(final.text);
      setUiErr("");
      onBaseChange(String(base));
    } else {
      const currentBaseNum = Number(baseValue || 0);
      const pretty =
        currentBaseNum > 0 ? baseToParent(assetId, currentBaseNum) : "";
      const final = clampParentInput(assetId, pretty);
      setText(final.text);
      setUiErr(final.err);
    }
  };

  const placeholder =
    assetSpecs[assetId]?.decimal > 0 ? "e.g. 100.0" : "e.g. 100";

  const hint =
    uiErr ||
    (() => {
      const { maxInt, maxFrac } = limitsHint(assetId);
      return `Up to ${maxInt} int / ${maxFrac} decimals`;
    })();

  return {
    value: text,
    uiErr,
    placeholder,
    hint,
    onChange,
    onBlur,
  };
}

function ApiResult({ data }: { data: any }) {
  if (!data) return null;
  const actionId = data?.data?.actionId ?? data?.actionId;
  console.log("actionId", actionId);
  const legIds: string[] = data?.data?.legIds ?? data?.legIds ?? [];
  return (
    <div className="rounded-md border bg-muted/30 mt-3">
      <div className="text-xs text-muted-foreground mb-1">Response</div>
      <div className="text-sm">
        <div>
          <span className="font-medium">actionId:</span>{" "}
          <span className="font-mono break-all">{String(actionId)}</span>
        </div>
        {Array.isArray(legIds) && legIds.length > 0 && (
          <div className="mt-1">
            <div className="font-medium">legIds:</div>
            <ul className="list-disc ml-5 space-y-1">
              {legIds.map((id) => (
                <li key={id} className="font-mono break-all">
                  {id}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function AssetSelect({
  value,
  onChange,
  assets,
}: {
  value?: string;
  onChange: (v: string) => void;
  assets: Asset[];
}) {
  return (
    <div className="space-y-1">
      <Label>Asset</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select asset" />
        </SelectTrigger>
        <SelectContent>
          {(Array.isArray(assets) ? assets : []).map((a) => (
            <SelectItem key={a._id} value={a._id}>
              <AssetLabel assetId={a._id} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function AmountInput({
  assetId,
  baseValue,
  onBaseChange,
  disabled,
}: {
  assetId: AssetType;
  baseValue?: number;
  onBaseChange: (v: string) => void;
  disabled?: boolean;
}) {
  const field = useClampedParentInput({
    assetId,
    baseValue: typeof baseValue === "number" ? baseValue : "",
    onBaseChange,
  });

  return (
    <div className="space-y-1">
      <Label>Amount</Label>
      <Input
        type="text"
        inputMode="decimal"
        className="placeholder:text-xs"
        value={field.value}
        placeholder={field.placeholder}
        onChange={(e) => field.onChange(e.target.value)}
        onBlur={field.onBlur}
        disabled={disabled}
      />
      <div className="flex justify-between">
        <span className="text-xs text-muted-foreground">&nbsp;</span>
        <span
          className={`text-xs ${
            field.uiErr ? "text-red-400" : "text-muted-foreground"
          }`}
        >
          {field.hint}
        </span>
      </div>
    </div>
  );
}

function SystemAccountSelect({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>System Account</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select system account" />
        </SelectTrigger>
        <SelectContent>
          {SYSTEM_ACCOUNTS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ActionDialog<
  Schema extends z.ZodTypeAny,
  Values extends z.infer<Schema>,
>({
  title,
  description,
  schema,
  onSubmit,
  renderFields,
  trigger,
  defaultValues,
}: {
  title: string;
  description?: string;
  schema: Schema;
  onSubmit: (values: Values) => Promise<any> | any;
  renderFields: (
    methods: ReturnType<typeof useForm<Values>>["control"],
    methods2: ReturnType<typeof useForm<Values>>,
  ) => React.ReactNode;
  trigger: React.ReactNode;
  defaultValues: Partial<Values>;
}) {
  const [open, setOpen] = useState(false);
  const [resp, setResp] = useState<any>(null);
  const methods = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as Values,
    mode: "onChange",
  });
  const { handleSubmit, control, reset, formState } = methods;

  const submit = async (v: Values) => {
    const r = await onSubmit(v);
    setResp(r);
    setOpen(false);
  };

  const close = () => {
    setOpen(false);
    setResp(null);
    reset(defaultValues as Values);
  };

  console.log({
    error: methods.formState.errors,
    values: methods.watch(),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <FormProvider {...methods}>
          <form className="space-y-4" onSubmit={handleSubmit(submit)}>
            {renderFields(control, methods)}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={close}>
                Close
              </Button>
              <Button
                type="submit"
                disabled={!formState.isValid || formState.isSubmitting}
              >
                {formState.isSubmitting ? "Processing…" : "Submit"}
              </Button>
            </div>

            <ApiResult data={resp} />
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

export default function Actions() {
  const { data: assetsResp } = useApiQuery(
    endpoints.entities.assetLedger.coins,
  );

  const coinAssets = useMemo<Asset[]>(() => {
    const arr = assetsResp?.data?.data ?? assetsResp?.data ?? assetsResp;
    return Array.isArray(arr) ? arr : FALLBACK_ASSETS;
  }, [assetsResp]);

  const onSuccessCallBacked = useCallback((resp) => {
    queryClient.invalidateQueries({
      queryKey: ["GET", endpoints?.entities?.assetLedger?.systemReport],
    });
  }, []);

  const mintMutation = useApiMutation({
    route: endpoints.entities.actions.mint,
    method: "POST",
    onSuccess: (resp) => {
      onSuccessCallBacked(resp);
      appToast.success("Mint Successful");
    },
  });
  const burnMutation = useApiMutation({
    route: endpoints.entities.actions.burn,
    method: "POST",
    onSuccess: (resp) => {
      onSuccessCallBacked(resp);
      appToast.success("Burn Successful");
    },
  });
  const fundMutation = useApiMutation({
    route: endpoints.entities.actions.fund,
    method: "POST",
    onSuccess: (resp) => {
      onSuccessCallBacked(resp);
      appToast.success("Fund Successful");
    },
  });
  const withdrawMutation = useApiMutation({
    route: endpoints.entities.actions.withdraw,
    method: "POST",
    onSuccess: (resp) => {
      onSuccessCallBacked(resp);
      appToast.success("Withdraw Successful");
    },
  });

  return (
    <div className="space-y-6">
      <Card className="px-0">
        <CardHeader>
          <CardTitle>Ledger Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* MINT */}
            <ActionDialog
              title="Mint"
              description="Move newly-created tokens into Treasury"
              schema={baseActionSchema}
              defaultValues={{ assetId: "xPoll", amount: 1 }}
              onSubmit={(v: MintBurnValues) => {
                return mintMutation.mutate(v);
              }}
              renderFields={(control, methods) => {
                const currentAsset = (methods.watch("assetId") ||
                  "xPoll") as AssetType;
                return (
                  <div className="space-y-3">
                    <Controller
                      control={control}
                      name="assetId"
                      render={({ field }) => (
                        <AssetSelect
                          value={field.value}
                          onChange={field.onChange}
                          assets={coinAssets}
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="amount"
                      render={({ field }) => (
                        <AmountInput
                          assetId={currentAsset}
                          baseValue={field.value}
                          onBaseChange={(baseStr) => {
                            if (baseStr === "") field.onChange(undefined);
                            else field.onChange(Number(baseStr));
                          }}
                        />
                      )}
                    />
                  </div>
                );
              }}
              trigger={<Button className="w-full">Mint</Button>}
            />
            {/* BURN */}
            <ActionDialog
              title="Burn"
              description="Destroy tokens from Treasury"
              schema={baseActionSchema}
              defaultValues={{ assetId: "xPoll", amount: 1 }}
              onSubmit={(v: MintBurnValues) => burnMutation.mutate(v)}
              renderFields={(control, methods) => {
                const currentAsset = (methods.watch("assetId") ||
                  "xPoll") as AssetType;
                return (
                  <div className="space-y-3">
                    <Controller
                      control={control}
                      name="assetId"
                      render={({ field }) => (
                        <AssetSelect
                          value={field.value}
                          onChange={field.onChange}
                          assets={coinAssets}
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="amount"
                      render={({ field }) => (
                        <AmountInput
                          assetId={currentAsset}
                          baseValue={field.value}
                          onBaseChange={(baseStr) => {
                            if (baseStr === "") field.onChange(undefined);
                            else field.onChange(Number(baseStr));
                          }}
                        />
                      )}
                    />
                  </div>
                );
              }}
              trigger={
                <Button variant="secondary" className="w-full">
                  Burn
                </Button>
              }
            />
            {/* FUND */}
            <ActionDialog
              title="Fund"
              description="Move from Treasury to a system account"
              schema={fundWithdrawSchema}
              defaultValues={{
                assetId: "xPoll",
                amount: 1,
                systemAccountId: SYSTEM_ACCOUNTS[0].value,
              }}
              onSubmit={(v: FundWithdrawValues) => fundMutation.mutate(v)}
              renderFields={(control, methods) => {
                const currentAsset = (methods.watch("assetId") ||
                  "xPoll") as AssetType;
                return (
                  <div className="space-y-3">
                    <Controller
                      control={control}
                      name="assetId"
                      render={({ field }) => (
                        <AssetSelect
                          value={field.value}
                          onChange={field.onChange}
                          assets={coinAssets}
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="amount"
                      render={({ field }) => (
                        <AmountInput
                          assetId={currentAsset}
                          baseValue={field.value}
                          onBaseChange={(baseStr) => {
                            if (baseStr === "") field.onChange(undefined);
                            else field.onChange(Number(baseStr));
                          }}
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="systemAccountId"
                      render={({ field }) => (
                        <SystemAccountSelect
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                );
              }}
              trigger={
                <Button variant="outline" className="w-full">
                  Fund
                </Button>
              }
            />

            {/* WITHDRAW */}
            <ActionDialog
              title="Withdraw"
              description="Move from a system account back to Treasury"
              schema={fundWithdrawSchema}
              defaultValues={{
                assetId: "xPoll",
                amount: 1,
                systemAccountId: SYSTEM_ACCOUNTS[0].value,
              }}
              onSubmit={(v: FundWithdrawValues) => withdrawMutation.mutate(v)}
              renderFields={(control, methods) => {
                const currentAsset = (methods.watch("assetId") ||
                  "xPoll") as AssetType;
                return (
                  <div className="space-y-3">
                    <Controller
                      control={control}
                      name="assetId"
                      render={({ field }) => (
                        <AssetSelect
                          value={field.value}
                          onChange={field.onChange}
                          assets={coinAssets}
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="amount"
                      render={({ field }) => (
                        <AmountInput
                          assetId={currentAsset}
                          baseValue={field.value}
                          onBaseChange={(baseStr) => {
                            if (baseStr === "") field.onChange(undefined);
                            else field.onChange(Number(baseStr));
                          }}
                        />
                      )}
                    />
                    <Controller
                      control={control}
                      name="systemAccountId"
                      render={({ field }) => (
                        <SystemAccountSelect
                          value={field.value}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  </div>
                );
              }}
              trigger={
                <Button variant="destructive" className="w-full">
                  Withdraw
                </Button>
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* <AllLedgerTable /> */}
    </div>
  );
}
