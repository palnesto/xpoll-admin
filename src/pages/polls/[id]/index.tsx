import { useMemo, useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { endpoints } from "@/api/endpoints";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Pencil, PlusSquare, Recycle, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fmt } from "@/components/paginated-table";

import { usePollViewStore } from "@/stores/poll_view.store";
import { AddOptionModal } from "@/components/modals/table_polls/add-option";
import { EditOptionModal } from "@/components/modals/table_polls/edit-option";
import { ArchiveToggleOptionModal } from "@/components/modals/table_polls/archive-toggle-option";
import { cn } from "@/lib/utils";

/* ---------- types ---------- */
type PollOption = {
  _id: string;
  text: string;
  archivedAt?: string | null;
};

type Poll = {
  pollId: string;
  title: string;
  description?: string;
  createdAt?: string;
  archivedAt?: string | null;
  resourceAssets?: unknown;
  options?: PollOption[];
};

const MAX_OPTIONS = 4;

/* small helper for details patch */
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

export default function PollShowPage() {
  const navigate = useNavigate();
  const { id = "" } = useParams<{ id: string }>();

  // GET one poll
  const showRoute = (endpoints.entities as any)?.polls?.getById
    ? (endpoints.entities as any).polls.getById(id)
    : `/poll/${id}`;
  const { data, isLoading, isError } = useApiQuery(showRoute);

  const poll: Poll | null = useMemo(() => {
    return data?.data?.data ?? data?.data ?? null;
  }, [data]);

  // ===== details editing =====
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [mediaUrl, setMediaUrl] = useState<string>("");

  useEffect(() => {
    if (!poll) return;
    setTitle(poll.title ?? "");
    setDescription(poll.description ?? "");
    setMediaUrl((poll as any)?.media ?? "");
  }, [poll]);

  const updateDetailsRoute =
    (endpoints.entities as any)?.polls?.updateDetails ?? "/poll/details";

  const { mutate: saveEdit, isPending: isSaving } = useApiMutation<any, any>({
    route: updateDetailsRoute,
    method: "PUT",
    onSuccess: () => {
      appToast.success("Poll updated");
      setIsEditing(false);

      patchShowCache(showRoute, (curr) => ({
        ...curr,
        title,
        description,
        media: mediaUrl,
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

  const onSubmitEdit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!poll) return;

      const payload: any = { pollId: id };
      if (title !== (poll.title ?? "")) payload.title = title;
      if (description !== (poll.description ?? ""))
        payload.description = description;
      if (mediaUrl !== ((poll as any)?.media ?? "")) payload.media = mediaUrl;

      if (Object.keys(payload).length <= 1) {
        setIsEditing(false);
        return;
      }
      saveEdit(payload);
    },
    [poll, id, title, description, mediaUrl, saveEdit]
  );

  const activeCount = (poll?.options ?? []).filter((o) => !o.archivedAt).length;
  const canAddOption = activeCount < MAX_OPTIONS;

  // ===== store actions for modals =====
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
            <CardTitle>Edit Poll</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmitEdit}>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Poll title"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Poll description"
                  className="flex h-28 w-full rounded-md border border-input bg-transparent text-foreground px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Media (URL)
                </label>
                <Input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://example.com/image-or-video"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving…" : "Save"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Poll</CardTitle>
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
              <div className="break-all">{(poll as any)?.media || "-"}</div>
            </div>
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

      {/* ===== Options card ===== */}
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
                    console.log("poll", poll);
                    setIsAddOption({ pollId: poll._id });
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
              {poll.options.map((opt) => {
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
                      {/* edit option -> modal */}
                      {!isArchived && (
                        <button
                          className="rounded-md p-1 hover:bg-foreground/10"
                          onClick={() =>
                            setIsEditOption({
                              pollId: poll._id,
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

                      {/* delete option  */}
                      {isArchived && activeCount + 1 > MAX_OPTIONS ? null : (
                        <button
                          className="rounded-md p-1 hover:bg-foreground/10"
                          onClick={() =>
                            setIsArchiveToggleOption({
                              pollId: poll._id,
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
                        className={`text-sm ${
                          isArchived ? "line-through opacity-60" : ""
                        }`}
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
