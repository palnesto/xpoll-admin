import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { fmt } from "@/components/paginated-table";
import TrialPollTable from "@/components/table-trial-poll";

import { Pencil, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CustomModal } from "@/components/modals/custom-modal";

type ResourceAsset = { type: "image" | "youtube" | string; value: string };
type TrialReward = {
  assetId: string;
  amount: number;
  rewardAmountCap?: number;
};
type Trial = {
  _id: string;
  title: string;
  description?: string;
  resourceAssets?: ResourceAsset[];
  rewards?: TrialReward[];
  createdAt?: string;
  archivedAt?: string | null;
};

function asYouTubeUrl(v: string) {
  try {
    const u = new URL(v);
    return u.toString();
  } catch {
    return `https://youtu.be/${v}`;
  }
}
function extractYouTubeId(input: string) {
  const idLike = /^[\w-]{11}$/;
  try {
    if (idLike.test(input)) return input;
    const u = new URL(input);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return idLike.test(id) ? id : input;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v") || "";
      return idLike.test(id) ? id : input;
    }
  } catch {}
  return input;
}
function patchShowCache(showKey: string, updater: (curr: any) => any) {
  const prev = queryClient.getQueryData<any>([showKey]);
  if (!prev) return;
  const lvl1 = prev?.data ?? {};
  const curr = lvl1?.data && typeof lvl1.data === "object" ? lvl1.data : lvl1;
  const nextCurr = updater(curr);
  const next = lvl1?.data
    ? { ...prev, data: { ...lvl1, data: nextCurr } }
    : { ...prev, data: nextCurr };
  queryClient.setQueryData([showKey], next);
}

/* ---------- edit form schema ---------- */
const assetZ = z.object({
  type: z.enum(["image", "youtube"]),
  value: z.string().min(1, "Required"),
});
const rewardZ = z
  .object({
    assetId: z.enum(["xOcta", "xMYST", "xDrop"]),
    amount: z.coerce.number().int().min(1, "Min 1"),
    rewardAmountCap: z.coerce.number().int().min(1, "Min 1"),
  })
  .refine((r) => r.rewardAmountCap >= r.amount, {
    path: ["rewardAmountCap"],
    message: "Cap must be ≥ amount",
  });

const editSchema = z.object({
  title: z.string().min(3, "Min 3 chars").trim(),
  description: z.string().min(3, "Min 3 chars").trim(),
  resourceAssets: z.array(assetZ).default([]),
  rewards: z.array(rewardZ).default([]),
});
type EditValues = z.infer<typeof editSchema>;

const ASSET_OPTIONS = [
  { label: "OCTA", value: "xOcta" },
  { label: "MYST", value: "xMYST" },
  { label: "DROP", value: "xDrop" },
] as const;

/* ---------- page ---------- */
export default function TrialShowPage() {
  const navigate = useNavigate();
  const { id = "" } = useParams<{ id: string }>();

  const showRoute = endpoints.entities.trials.getById(id);
  const { data, isLoading, isError } = useApiQuery(showRoute);

  const trial: Trial | null = useMemo(() => {
    return data?.data?.data ?? data?.data ?? null;
  }, [data]);

  // edit toggle
  const [isEditing, setIsEditing] = useState(false);

  // RHF lives at top-level (no conditional hooks)
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: "",
      description: "",
      resourceAssets: [],
      rewards: [],
    },
    mode: "onChange",
  });
  const { control, handleSubmit, watch, reset } = form;

  // arrays for assets/rewards
  const assetArray = useFieldArray({ control, name: "resourceAssets" });
  const rewardsArray = useFieldArray({ control, name: "rewards" });

  // hydrate form when trial loads
  useEffect(() => {
    if (!trial) return;
    reset({
      title: trial.title ?? "",
      description: trial.description ?? "",
      resourceAssets: (trial.resourceAssets ?? []).map((a) => ({
        type: (a.type as "image" | "youtube") ?? "image",
        value: String(a.value ?? ""),
      })),
      rewards: (trial.rewards ?? []).map((r) => ({
        assetId: (r.assetId as "xOcta" | "xMYST" | "xDrop") ?? "xOcta",
        amount: Number(r.amount ?? 1),
        rewardAmountCap: Number(r.rewardAmountCap ?? r.amount ?? 1),
      })),
    });
  }, [trial, reset]);

  const { mutate: saveEdit, isPending: isSaving } = useApiMutation<any, any>({
    route: endpoints.entities.trials.update, // PUT /trial
    method: "PUT",
    onSuccess: (_resp, vars) => {
      appToast.success("Trial updated");
      setIsEditing(false);

      // optimistic patch with submitted values
      const v = vars as any;
      patchShowCache(showRoute, (curr) => ({
        ...curr,
        title: v.title ?? curr.title,
        description: v.description ?? curr.description,
        resourceAssets: v.resourceAssets ?? curr.resourceAssets,
        rewards: v.rewards ?? curr.rewards,
      }));

      queryClient.invalidateQueries({ queryKey: [showRoute] });
      queryClient.invalidateQueries({
        queryKey: [endpoints.entities.trials.all],
      });
    },
  });

  const onSubmitEdit = handleSubmit((v) => {
    if (!trial) return;

    // normalize youtube ids
    const normAssets = (v.resourceAssets ?? []).map((a) => ({
      type: a.type,
      value:
        a.type === "youtube"
          ? extractYouTubeId(a.value.trim())
          : a.value.trim(),
    }));

    const payload: any = {
      trialId: id,
      title: v.title,
      description: v.description,
      resourceAssets: normAssets,
    };
    if (Array.isArray(v.rewards)) {
      payload.rewards = v.rewards.map((r) => ({
        assetId: r.assetId,
        amount: r.amount,
        rewardAmountCap: r.rewardAmountCap,
      }));
    }

    saveEdit(payload);
  });

  // delete
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { mutate: doDelete, isPending: isDeleting } = useApiMutation<any, any>({
    route: endpoints.entities.trials.delete, // DELETE /trial
    method: "DELETE",
    onSuccess: () => {
      appToast.success("Trial deleted");
      queryClient.invalidateQueries({
        queryKey: [endpoints.entities.trials.all],
      });
      navigate("/trials");
    },
  });

  if (!id) {
    return (
      <div className="p-4">
        <p className="mb-4 text-sm text-muted-foreground">
          Missing trial id in the route.
        </p>
        <Button onClick={() => navigate("/trials")}>Back to Trials</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (isError || !trial) {
    return (
      <div className="p-4">
        <p className="mb-4 text-sm text-destructive">
          Failed to load this trial.
        </p>
        <Button variant="outline" onClick={() => navigate("/trials")}>
          Back to Trials
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-5xl">
      <div className="pt-2">
        <Button variant="outline" onClick={() => navigate("/trials")}>
          Back to Trials
        </Button>
      </div>

      {/* ===== TRIAL CARD ===== */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Trial</CardTitle>

          {!isEditing && (
            <TooltipProvider delayDuration={0}>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="rounded-md p-1 hover:bg-foreground/10"
                      onClick={() => setIsEditing(true)}
                      aria-label="Edit trial"
                      title="Edit"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Edit</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="rounded-md p-1 hover:bg-foreground/10"
                      onClick={() => setIsDeleteOpen(true)}
                      aria-label="Delete trial"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {isEditing ? (
            <Form {...form}>
              <form className="space-y-6" onSubmit={onSubmitEdit}>
                {/* Title */}
                <FormField
                  control={control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Trial title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Short description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Resource Assets */}
                <div className="space-y-2">
                  <FormLabel>Media (Images / YouTube) – optional</FormLabel>
                  {assetArray.fields.map((f, idx) => {
                    const typeName = `resourceAssets.${idx}.type` as const;
                    const valueName = `resourceAssets.${idx}.value` as const;
                    const t = watch(typeName);
                    return (
                      <div
                        key={f.id}
                        className="grid grid-cols-12 gap-2 items-end"
                      >
                        <div className="col-span-4">
                          <FormField
                            control={control}
                            name={typeName}
                            render={({ field }) => (
                              <FormItem>
                                <label className="text-xs">Type</label>
                                <FormControl>
                                  <select
                                    className="w-full h-9 border rounded-md px-2 bg-transparent"
                                    {...field}
                                  >
                                    <option value="image">IMAGE</option>
                                    <option value="youtube">YOUTUBE</option>
                                  </select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-7">
                          <FormField
                            control={control}
                            name={valueName}
                            render={({ field }) => (
                              <FormItem>
                                <label className="text-xs">
                                  {t === "youtube"
                                    ? "YouTube URL or ID"
                                    : "Image URL"}
                                </label>
                                <FormControl>
                                  <Input
                                    placeholder={
                                      t === "youtube"
                                        ? "https://youtube.com/watch?v=… or 11-char ID"
                                        : "https://example.com/pic.jpg"
                                    }
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => assetArray.remove(idx)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        assetArray.append({ type: "image", value: "" })
                      }
                    >
                      + Image
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        assetArray.append({ type: "youtube", value: "" })
                      }
                    >
                      + YouTube
                    </Button>
                  </div>
                </div>

                {/* Rewards */}
                <div className="space-y-2">
                  <FormLabel>Rewards (optional)</FormLabel>
                  {rewardsArray.fields.map((f, rIdx) => (
                    <div
                      key={f.id}
                      className="grid grid-cols-12 gap-2 items-end"
                    >
                      <div className="col-span-4">
                        <FormField
                          control={control}
                          name={`rewards.${rIdx}.assetId`}
                          render={({ field }) => (
                            <FormItem>
                              <label className="text-xs">Asset</label>
                              <FormControl>
                                <select
                                  className="w-full h-9 border rounded-md px-2 bg-transparent"
                                  {...field}
                                >
                                  {ASSET_OPTIONS.map((o) => (
                                    <option
                                      key={o.value}
                                      value={o.value}
                                      className="bg-gray-900"
                                    >
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-3">
                        <FormField
                          control={control}
                          name={`rewards.${rIdx}.amount`}
                          render={({ field }) => (
                            <FormItem>
                              <label className="text-xs">Amount</label>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  step={1}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-3">
                        <FormField
                          control={control}
                          name={`rewards.${rIdx}.rewardAmountCap`}
                          render={({ field }) => (
                            <FormItem>
                              <label className="text-xs">Reward Cap</label>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  step={1}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => rewardsArray.remove(rIdx)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        rewardsArray.append({
                          assetId: ASSET_OPTIONS[0].value,
                          amount: 1,
                          rewardAmountCap: 1,
                        })
                      }
                    >
                      + Reward
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      // reset to current server values and exit edit
                      reset({
                        title: trial.title ?? "",
                        description: trial.description ?? "",
                        resourceAssets:
                          (trial.resourceAssets ?? []).map((a) => ({
                            type: (a.type as "image" | "youtube") ?? "image",
                            value: String(a.value ?? ""),
                          })) ?? [],
                        rewards:
                          (trial.rewards ?? []).map((r) => ({
                            assetId:
                              (r.assetId as "xOcta" | "xMYST" | "xDrop") ??
                              "xOcta",
                            amount: Number(r.amount ?? 1),
                            rewardAmountCap: Number(
                              r.rewardAmountCap ?? r.amount ?? 1
                            ),
                          })) ?? [],
                      });
                      setIsEditing(false);
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <>
              {/* read view */}
              <div>
                <div className="text-xs text-muted-foreground">ID</div>
                <div className="font-mono break-all">{trial._id}</div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Title</div>
                <div className="font-medium">{trial.title}</div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Description</div>
                <div>{trial.description || "-"}</div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">
                  Resource Assets
                </div>
                {Array.isArray(trial.resourceAssets) &&
                trial.resourceAssets.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {trial.resourceAssets.map((ra, i) => (
                      <li key={`${ra.type}-${i}`} className="break-all">
                        <span className="text-xs mr-2 px-1.5 py-0.5 rounded bg-muted">
                          {String(ra.type).toUpperCase()}
                        </span>
                        {ra.type === "youtube" ? (
                          <a
                            className="underline hover:no-underline"
                            href={asYouTubeUrl(ra.value)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {asYouTubeUrl(ra.value)}
                          </a>
                        ) : (
                          <a
                            className="underline hover:no-underline"
                            href={ra.value}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {ra.value}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div>-</div>
                )}
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Rewards</div>
                {Array.isArray(trial.rewards) && trial.rewards.length > 0 ? (
                  <div className="overflow-x-auto rounded border">
                    <table className="min-w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">
                            Asset
                          </th>
                          <th className="text-left px-3 py-2 font-medium">
                            Amount
                          </th>
                          <th className="text-left px-3 py-2 font-medium">
                            Reward Cap
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {trial.rewards.map((r, idx) => (
                          <tr key={`${r.assetId}-${idx}`} className="border-t">
                            <td className="px-3 py-2">{r.assetId}</td>
                            <td className="px-3 py-2">{r.amount}</td>
                            <td className="px-3 py-2">
                              {r.rewardAmountCap ?? "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div>-</div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Created At
                  </div>
                  <div>{fmt(trial.createdAt)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    Archived At
                  </div>
                  <div>{fmt(trial.archivedAt)}</div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Polls in this trial */}
      <TrialPollTable trialId={id} />

      {/* Delete modal */}
      {isDeleteOpen && (
        <CustomModal
          isOpen
          onClose={() => setIsDeleteOpen(false)}
          title="Delete Trial"
          onSubmit={() => {}}
          footer={<></>}
        >
          <p className="mb-4">Are you sure you want to delete this trial?</p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => doDelete({ ids: [id] })}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </CustomModal>
      )}
    </div>
  );
}
