import { useCallback, useMemo, useState } from "react";
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
import { appToast } from "@/utils/toast";
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
import { AllLedgerTable } from "../asset-ledger/all-ledger";
import { queryClient } from "@/api/queryClient";
import { trimUrl } from "@/utils/formatter";

type Asset = { _id: string; name: string; symbol: string };

const SYSTEM_ACCOUNTS = [
  { label: "Exchange", value: "bbbbbbbbbbbbbbbbbbbbbbbb" },
  { label: "Poll Funds", value: "cccccccccccccccccccccccc" },
] as const;

const FALLBACK_ASSETS: Asset[] = [
  { _id: "xPoll", symbol: "XPL", name: "XPOLL" },
  { _id: "xOcta", symbol: "XOT", name: "xOCTA" },
  { _id: "xMYST", symbol: "XMT", name: "XMYST" },
  { _id: "xDrop", symbol: "XDP", name: "XDROP" },
] as const;

const baseActionSchema = z.object({
  assetId: z.enum(["xPoll", "xOcta", "xMYST", "xDrop"], {
    required_error: "Select an asset",
  }),
  amount: z.coerce.number().int().min(1, "Min 1"),
});

const fundWithdrawSchema = baseActionSchema.extend({
  systemAccountId: z.enum(
    SYSTEM_ACCOUNTS.map((s) => s.value) as [string, ...string[]],
    {
      required_error: "Select a system account",
    }
  ),
});

type MintBurnValues = z.infer<typeof baseActionSchema>;
type FundWithdrawValues = z.infer<typeof fundWithdrawSchema>;

// ------------------ Helpers ------------------
function ApiResult({ data }: { data: any }) {
  if (!data) return null;
  const actionId = data?.data?.actionId ?? data?.actionId;
  const legIds: string[] = data?.data?.legIds ?? data?.legIds ?? [];
  return (
    <div className="rounded-md border p-3 bg-muted/30 mt-3">
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
              {a.name} ({a.symbol})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function AmountInput({
  value,
  onChange,
  disabled,
}: {
  value?: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label>Amount</Label>
      <Input
        type="number"
        min={1}
        step={1}
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
      />
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
  Values extends z.infer<Schema>
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
    methods2: ReturnType<typeof useForm<Values>>
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
    if ((r as any)?.success || (r as any)?.statusCode === 200) {
      appToast.success("Success");
    } else {
      appToast.error("Failed");
    }
  };

  const close = () => {
    setOpen(false);
    setResp(null);
    reset(defaultValues as Values);
  };

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
  const { data: assetsResp } = useApiQuery("/common/assets/coins");
  console.log("coins resp", assetsResp);

  const coinAssets = useMemo<Asset[]>(() => {
    const arr = assetsResp?.data?.data ?? assetsResp?.data ?? assetsResp;
    return Array.isArray(arr) ? arr : FALLBACK_ASSETS;
  }, [assetsResp]);

  const onSuccessCallBacked = useCallback((resp) => {
    console.log("reaching?", trimUrl(endpoints.entities.assetLedger.all));
    queryClient.invalidateQueries({
      queryKey: [trimUrl(endpoints.entities.assetLedger.all)],
    });
  }, []);

  // mutations
  const mintMutation = useApiMutation({
    route: endpoints.entities.actions.mint,
    method: "POST",
    onSuccess: onSuccessCallBacked,
  });
  const burnMutation = useApiMutation({
    route: endpoints.entities.actions.burn,
    method: "POST",
  });
  const fundMutation = useApiMutation({
    route: endpoints.entities.actions.fund,
    method: "POST",
  });
  const withdrawMutation = useApiMutation({
    route: endpoints.entities.actions.withdraw,
    method: "POST",
  });

  return (
    <div className="p-4 space-y-6">
      <Card>
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
              renderFields={(control) => (
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
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
              )}
              trigger={<Button className="w-full">Mint</Button>}
            />

            {/* BURN */}
            <ActionDialog
              title="Burn"
              description="Destroy tokens from Treasury"
              schema={baseActionSchema}
              defaultValues={{ assetId: "xPoll", amount: 1 }}
              onSubmit={(v: MintBurnValues) => burnMutation.mutate(v)}
              renderFields={(control) => (
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
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
              )}
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
              renderFields={(control) => (
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
                        value={field.value}
                        onChange={field.onChange}
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
              )}
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
              renderFields={(control) => (
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
                        value={field.value}
                        onChange={field.onChange}
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
              )}
              trigger={
                <Button variant="destructive" className="w-full">
                  Withdraw
                </Button>
              }
            />
          </div>
        </CardContent>
      </Card>

      <AllLedgerTable />
    </div>
  );
}
