import { useMemo, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";

import { Button } from "@/components/ui/button";
import { Edit, Pencil, PlusSquare, Recycle, Trash2, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fmt } from "@/components/paginated-table";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { usePollViewStore } from "@/stores/poll_view.store";
import { AddOptionModal } from "@/components/modals/table_polls/add-option";
import { EditOptionModal } from "@/components/modals/table_polls/edit-option";
import { ArchiveToggleOptionModal } from "@/components/modals/table_polls/archive-toggle-option";
import { cn } from "@/lib/utils";

import CountrySelect from "@/components/commons/selects/country-select";
import StateSelect from "@/components/commons/selects/state-select";
import { CitySelect } from "@/components/commons/selects/city-select";

/* ---------- types ---------- */
type PollOption = {
  _id: string;
  text: string;
  archivedAt?: string | null;
};

type Poll = {
  _id?: string;
  pollId: string;
  title: string;
  description?: string;
  createdAt?: string;
  archivedAt?: string | null;
  media?: string;
  options?: PollOption[];
  targetGeo?: {
    countries?: string[];
    states?: string[];
    cities?: string[];
  };
  /** present if this poll belongs to a trial */
  trialId?: string;
  /** some backends embed trial object instead */
  trial?: { _id: string; title?: string };
};

const MAX_OPTIONS = 4;

/* ---------- helpers ---------- */
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

type LV = { label: string; value: string };
const arrEqUnordered = (a: string[], b: string[]) => {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  const A = [...a].sort();
  const B = [...b].sort();
  return A.every((v, i) => v === B[i]);
};

/** Base edit schema. We’ll conditionally HIDE targetGeo if it’s a trial poll. */
const editSchema = z.object({
  title: z.string().min(3, "Min 3 chars").trim(),
  description: z.string().min(3, "Min 3 chars").trim(),
  media: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || /^https?:\/\/.+/i.test(v),
      "Must be a valid URL (http/https) or leave empty"
    ),
  targetGeo: z
    .object({
      countries: z.array(z.string()).default([]),
      states: z.array(z.string()).default([]),
      cities: z.array(z.string()).default([]),
    })
    .default({ countries: [], states: [], cities: [] }),
});
type EditValues = z.infer<typeof editSchema>;

export default function PollShowPage() {
  const navigate = useNavigate();
  const { id = "" } = useParams<{ id: string }>();

  const showRoute = (endpoints.entities as any)?.polls?.getById
    ? (endpoints.entities as any).polls.getById(id)
    : `/poll/${id}`;
  const { data, isLoading, isError } = useApiQuery(showRoute);

  const poll: Poll | null = useMemo(() => {
    return data?.data?.data ?? data?.data ?? null;
  }, [data]);

  const isTrialPoll = !!(poll?.trialId || poll?.trial?._id);

  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: "",
      description: "",
      media: "",
      targetGeo: { countries: [], states: [], cities: [] },
    },
    mode: "onChange",
  });
  const { control, handleSubmit, reset, getValues } = form;

  // ===== Target Geo local state (multi-select LV[]) =====
  const [geoCountries, setGeoCountries] = useState<LV[]>([]);
  const [geoStates, setGeoStates] = useState<LV[]>([]);
  const [geoCities, setGeoCities] = useState<LV[]>([]);

  // hydrate form + geos when poll loads
  useEffect(() => {
    if (!poll) return;

    reset({
      title: poll.title ?? "",
      description: poll.description ?? "",
      media: (poll as any)?.media ?? "",
      targetGeo: {
        countries: Array.isArray(poll.targetGeo?.countries)
          ? poll.targetGeo!.countries
          : [],
        states: Array.isArray(poll.targetGeo?.states)
          ? poll.targetGeo!.states
          : [],
        cities: Array.isArray(poll.targetGeo?.cities)
          ? poll.targetGeo!.cities
          : [],
      },
    });

    setGeoCountries(
      Array.isArray(poll.targetGeo?.countries)
        ? poll.targetGeo!.countries.map((c) => ({ label: c, value: c }))
        : []
    );
    setGeoStates(
      Array.isArray(poll.targetGeo?.states)
        ? poll.targetGeo!.states.map((s) => ({ label: s, value: s }))
        : []
    );
    setGeoCities(
      Array.isArray(poll.targetGeo?.cities)
        ? poll.targetGeo!.cities.map((c) => ({ label: c, value: c }))
        : []
    );
  }, [poll, reset]);

  const { mutate: saveEdit, isPending: isSaving } = useApiMutation<any, any>({
    route: endpoints.entities.polls.edit.details,
    method: "PUT",
    onSuccess: (_resp, _vars) => {
      appToast.success("Poll updated");
      setIsEditing(false);

      const v = getValues();
      const tgFromState = {
        countries: geoCountries.map((c) => c.value),
        states: geoStates.map((s) => s.value),
        cities: geoCities.map((c) => c.value),
      };

      patchShowCache(showRoute, (curr) => ({
        ...curr,
        title: v.title,
        description: v.description,
        media: v.media,
        // IMPORTANT: trial polls do not update targetGeo here (it’s controlled at trial)
        targetGeo: isTrialPoll ? curr.targetGeo : tgFromState ?? curr.targetGeo,
      }));

      queryClient.invalidateQueries({ queryKey: [showRoute] });
      queryClient.invalidateQueries({
        predicate: (q) =>
          typeof q.queryKey?.[0] === "string" &&
          (q.queryKey[0] as string).startsWith(
            (endpoints.entities as any)?.polls?.all ?? "/poll/list"
          ),
      });
    },
  });

  // submit with diffs only
  const onSubmitEdit = handleSubmit((v) => {
    if (!poll) return;

    const payload: any = { pollId: id };

    if (v.title !== (poll.title ?? "")) payload.title = v.title;
    if (v.description !== (poll.description ?? ""))
      payload.description = v.description;
    if (v.media !== ((poll as any)?.media ?? "")) payload.media = v.media;

    // Only include targetGeo for NON-trial polls
    if (!isTrialPoll) {
      const nextTG = {
        countries: geoCountries.map((c) => c.value),
        states: geoStates.map((s) => s.value),
        cities: geoCities.map((c) => c.value),
      };
      const prevTG = {
        countries: poll.targetGeo?.countries ?? [],
        states: poll.targetGeo?.states ?? [],
        cities: poll.targetGeo?.cities ?? [],
      };

      const geoChanged =
        !arrEqUnordered(nextTG.countries, prevTG.countries) ||
        !arrEqUnordered(nextTG.states, prevTG.states) ||
        !arrEqUnordered(nextTG.cities, prevTG.cities);

      if (geoChanged) payload.targetGeo = nextTG;
    }

    if (Object.keys(payload).length <= 1) {
      setIsEditing(false);
      return;
    }

    saveEdit(payload);
  });

  const activeCount = (poll?.options ?? []).filter((o) => !o.archivedAt).length;
  const canAddOption = activeCount < MAX_OPTIONS;

  // ===== option modals =====
  const isAddOption = usePollViewStore((s) => s.isAddOption);
  const setIsAddOption = usePollViewStore((s) => s.setIsAddOption);
  const isEditOption = usePollViewStore((s) => s.isEditOption);
  const setIsEditOption = usePollViewStore((s) => s.setIsEditOption);
  const isArchiveToggleOption = usePollViewStore(
    (s) => s.isArchiveToggleOption
  );
  const setIsArchiveToggleOption = usePollViewStore(
    (s) => s.setIsArchiveToggleOption
  );

  // ===== page loading / error =====
  if (!id) {
    return (
      <div className="p-4">
        <p className="mb-4 text-sm text-muted-foreground">
          Missing poll id in the route.
        </p>
        <Button onClick={() => navigate("/polls")}>Back to Polls</Button>
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
  if (isError || !poll) {
    return (
      <div className="p-4">
        <p className="mb-4 text-sm text-destructive">
          Failed to load this poll.
        </p>
        <Button variant="outline" onClick={() => navigate("/polls")}>
          Back to Polls
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-4xl">
      {isEditing ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Edit Poll
              {/* {isTrialPoll && (
                <span className="text-xs rounded px-2 py-0.5 bg-muted">
                  Trial poll — Target Geo managed by Trial
                </span>
              )} */}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-4" onSubmit={onSubmitEdit}>
                {/* Title */}
                <FormField
                  control={control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        Title
                      </FormLabel>
                      <FormControl>
                        <input
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          placeholder="Poll title"
                          required
                          {...field}
                        />
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
                      <FormLabel className="text-xs text-muted-foreground">
                        Description
                      </FormLabel>
                      <FormControl>
                        <textarea
                          placeholder="Poll description"
                          className="flex h-28 w-full rounded-md border border-input bg-transparent text-foreground px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Media */}
                <FormField
                  control={control}
                  name="media"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        Media (URL)
                      </FormLabel>
                      <FormControl>
                        <input
                          type="url"
                          placeholder="https://example.com/image-or-video"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Target Geo (HIDDEN for trial polls) */}
                {!isTrialPoll && (
                  <div className="space-y-4 text-black">
                    {/* Countries */}
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        Countries
                      </label>
                      <CountrySelect
                        value={geoCountries}
                        onChange={(val) => {
                          const newVal = Array.isArray(val)
                            ? val
                            : val
                            ? [val]
                            : [];
                          setGeoCountries((prev) => {
                            const merged = [...prev];
                            for (const v of newVal) {
                              if (!merged.some((m) => m.value === v.value))
                                merged.push(v);
                            }
                            return merged;
                          });
                        }}
                        isMulti
                        isOptionDisabled={(option: LV) =>
                          geoCountries.some((c) => c.value === option.value)
                        }
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        {geoCountries.map((country) => (
                          <span
                            key={country.value}
                            className="px-2 py-1 rounded bg-muted text-sm flex items-center gap-1 text-white"
                          >
                            {country.label}
                            <X
                              className="w-3 h-3 cursor-pointer"
                              onClick={() =>
                                setGeoCountries((prev) =>
                                  prev.filter((x) => x.value !== country.value)
                                )
                              }
                            />
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* States */}
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        States
                      </label>
                      <StateSelect
                        value={geoStates}
                        onChange={(val) => {
                          const newVal = Array.isArray(val)
                            ? val
                            : val
                            ? [val]
                            : [];
                          setGeoStates((prev) => {
                            const merged = [...prev];
                            for (const v of newVal) {
                              if (!merged.some((m) => m.value === v.value))
                                merged.push(v);
                            }
                            return merged;
                          });
                        }}
                        isMulti
                        isOptionDisabled={(option: LV) =>
                          geoStates.some((s) => s.value === option.value)
                        }
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        {geoStates.map((s) => (
                          <span
                            key={s.value}
                            className="px-2 py-1 rounded bg-muted text-sm flex items-center gap-1 text-white"
                          >
                            {s.label}
                            <X
                              className="w-3 h-3 cursor-pointer"
                              onClick={() =>
                                setGeoStates((prev) =>
                                  prev.filter((x) => x.value !== s.value)
                                )
                              }
                            />
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Cities */}
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        Cities
                      </label>
                      <CitySelect
                        value={geoCities}
                        onChange={(val) => {
                          const newVal = Array.isArray(val)
                            ? val
                            : val
                            ? [val]
                            : [];
                          setGeoCities((prev) => {
                            const merged = [...prev];
                            for (const v of newVal) {
                              if (!merged.some((m) => m.value === v.value))
                                merged.push(v);
                            }
                            return merged;
                          });
                        }}
                        isMulti
                        isOptionDisabled={(option: LV) =>
                          geoCities.some((c) => c.value === option.value)
                        }
                      />
                      <div className="flex flex-wrap gap-2 mt-2">
                        {geoCities.map((city) => (
                          <span
                            key={city.value}
                            className="px-2 py-1 rounded bg-muted text-sm flex items-center gap-1 text-white"
                          >
                            {city.label}
                            <X
                              className="w-3 h-3 cursor-pointer"
                              onClick={() =>
                                setGeoCities((prev) =>
                                  prev.filter((x) => x.value !== city.value)
                                )
                              }
                            />
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      reset({
                        title: poll.title ?? "",
                        description: poll.description ?? "",
                        media: (poll as any)?.media ?? "",
                        targetGeo: {
                          countries: poll.targetGeo?.countries ?? [],
                          states: poll.targetGeo?.states ?? [],
                          cities: poll.targetGeo?.cities ?? [],
                        },
                      });
                      setGeoCountries(
                        Array.isArray(poll.targetGeo?.countries)
                          ? poll.targetGeo!.countries.map((c) => ({
                              label: c,
                              value: c,
                            }))
                          : []
                      );
                      setGeoStates(
                        Array.isArray(poll.targetGeo?.states)
                          ? poll.targetGeo!.states.map((s) => ({
                              label: s,
                              value: s,
                            }))
                          : []
                      );
                      setGeoCities(
                        Array.isArray(poll.targetGeo?.cities)
                          ? poll.targetGeo!.cities.map((c) => ({
                              label: c,
                              value: c,
                            }))
                          : []
                      );
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
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Poll
              {/* {isTrialPoll && (
                <span className="text-xs rounded px-2 py-0.5 bg-muted">
                  Trial poll — Target Geo is controlled by Trial
                </span>
              )} */}
            </CardTitle>
            <button
              className="rounded-md p-1 hover:bg-foreground/10"
              onClick={() => setIsEditing(true)}
              aria-label="Edit poll"
              title="Edit poll"
            >
              <Edit className="w-4 h-4" />
            </button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground">ID</div>
              <div className="font-mono break-all">{poll.pollId}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Title</div>
              <div className="font-medium">{poll.title}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Description</div>
              <div>{poll.description || "-"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Media</div>
              <div className="break-all">{poll.media || "-"}</div>
            </div>

            {/* Hide Target Geo block entirely for trial polls */}
            {!isTrialPoll && (
              <div>
                <div className="text-xs text-muted-foreground">Target Geo</div>
                <h2 className="break-all">
                  Countries-{" "}
                  {Array.isArray(poll.targetGeo?.countries)
                    ? poll.targetGeo!.countries.join(", ")
                    : "-"}
                </h2>
                <h2 className="break-all">
                  States-{" "}
                  {Array.isArray(poll.targetGeo?.states)
                    ? poll.targetGeo!.states.join(", ")
                    : "-"}
                </h2>
                <h2 className="break-all">
                  Cities-{" "}
                  {Array.isArray(poll.targetGeo?.cities)
                    ? poll.targetGeo!.cities.join(", ")
                    : "-"}
                </h2>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Created At</div>
                <div>{fmt(poll.createdAt)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Archived At</div>
                <div>{fmt(poll.archivedAt)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== Options card (unchanged) ===== */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Options</CardTitle>

          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={`rounded-md p-1 hover:bg-foreground/10 ${
                    !canAddOption ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  onClick={() => {
                    if (!canAddOption) return;
                    setIsAddOption({ pollId: (poll as any)._id });
                  }}
                  aria-label="Add option"
                  title={canAddOption ? "Add option" : "Max 4 active options"}
                  disabled={!canAddOption}
                >
                  <PlusSquare className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              {!canAddOption && (
                <TooltipContent>Maximum of 4 active options</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </CardHeader>

        <CardContent className="space-y-4">
          {poll?.options?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(poll.options ?? []).map((opt) => {
                const isArchived = !!opt.archivedAt;
                return (
                  <div
                    key={opt._id}
                    className={cn(
                      "relative border rounded-lg p-3 hover:bg-muted/30",
                      isArchived && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="absolute right-2 top-2 flex items-center gap-2">
                      {!isArchived && (
                        <button
                          className="rounded-md p-1 hover:bg-foreground/10"
                          onClick={() =>
                            setIsEditOption({
                              pollId: (poll as any)._id,
                              optionId: opt._id,
                              oldText: opt.text,
                            })
                          }
                          aria-label={`Edit option ${opt.text}`}
                          title="Edit option"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}

                      {isArchived && activeCount + 1 > MAX_OPTIONS ? null : (
                        <button
                          className="rounded-md p-1 hover:bg-foreground/10"
                          onClick={() =>
                            setIsArchiveToggleOption({
                              pollId: (poll as any)._id,
                              optionId: opt._id,
                              shouldArchive: !isArchived,
                            })
                          }
                          aria-label={`Delete option ${opt.text}`}
                          title="Delete option"
                          disabled={!isArchived && activeCount <= 2}
                        >
                          {!isArchived ? (
                            <Trash2 className={`w-4 h-4 text-red-600`} />
                          ) : (
                            <Recycle className={`w-4 h-4 text-white`} />
                          )}
                        </button>
                      )}
                    </div>

                    <div className="pr-10">
                      <div className="text-xs text-muted-foreground mb-1">
                        Option ID
                      </div>
                      <div className="font-mono text-xs break-all mb-2">
                        {opt._id}
                      </div>
                      <div
                        className={cn(
                          "text-sm",
                          isArchived && "line-through opacity-60"
                        )}
                      >
                        {opt.text}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Archived: {opt.archivedAt ? fmt(opt.archivedAt) : "-"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No options were found on this poll.
            </div>
          )}
        </CardContent>
      </Card>

      {isAddOption && <AddOptionModal />}
      {isEditOption && <EditOptionModal />}
      {isArchiveToggleOption && <ArchiveToggleOptionModal />}
    </div>
  );
}
