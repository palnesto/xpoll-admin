import { Trash2, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import { queryClient } from "@/api/queryClient";
import { endpoints } from "@/api/endpoints";
import { appToast } from "@/utils/toast";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type { AddRemoveLinkBody, EntityType } from "./types/entity-link";

type ForwardApiItem = {
  _id: string;
  to: {
    type: EntityType;
    id: string; // IMPORTANT: GET returns "id"
    entity?: {
      isPopulationAvailable?: boolean;
      data?: {
        title?: string; // poll
        name?: string; // campaign/trial/blog
        description?: string;
      };
    };
  };
  createdAt?: string;
};

type Props = {
  fromType: EntityType;
  fromId: string;
  className?: string;
};

export function LinkedEntityForwardList({
  fromType,
  fromId,
  className,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selected, setSelected] = useState<{
    toType: EntityType;
    toId: string;
    title?: string;
  } | null>(null);

  const forwardUrl = useMemo(
    () => endpoints.entities.entityLink.listForward(fromType, fromId),
    [fromType, fromId],
  );

  /**
   * ✅ CANONICAL KEY: your useApiQuery very likely uses ["GET", url]
   * So invalidate/refetch MUST target the same.
   */
  const forwardQueryKey = useMemo(() => ["GET", forwardUrl], [forwardUrl]);

  const { data, isLoading, isError } = useApiQuery(forwardUrl, {
    key: forwardQueryKey,
    enabled: !!fromType && !!fromId,
  } as any);

  /**
   * Your console log shows the API can return an array directly.
   * Some wrappers may wrap into { entries }.
   * So handle both safely.
   */
  const entries: ForwardApiItem[] = useMemo(() => {
    const raw = (data?.data?.data ?? data?.data) as any;
    if (Array.isArray(raw)) return raw as ForwardApiItem[];
    if (Array.isArray(raw?.entries)) return raw.entries as ForwardApiItem[];
    return [];
  }, [data]);

  const closeConfirm = () => {
    setConfirmOpen(false);
    setSelected(null);
  };

  const openConfirm = (toType: EntityType, toId: string, title?: string) => {
    setSelected({ toType, toId, title });
    setConfirmOpen(true);
  };

  const invalidateForward = async () => {
    // invalidate + refetch active so UI updates immediately
    await queryClient.invalidateQueries({ queryKey: forwardQueryKey });
    await queryClient.refetchQueries({
      queryKey: forwardQueryKey,
      type: "active",
    });
  };

  const { mutate: removeLink, isPending: isRemoving } = useApiMutation<
    any,
    AddRemoveLinkBody
  >({
    route: endpoints.entities.entityLink.remove,
    method: "POST",
    onSuccess: async () => {
      appToast.success("Link removed");
      await invalidateForward();
      closeConfirm();
    },
    onError: (e: any) => {
      appToast.error(e?.message ?? "Failed to remove link");
    },
  });

  const onRemove = (toType: EntityType, toId: string) => {
    removeLink({
      from: { type: fromType, _id: fromId },
      to: { type: toType, _id: toId }, // backend expects "_id" in body
    });
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">Linked Entities</h3>
        {isLoading && (
          <span className="text-xs text-muted-foreground">Loading…</span>
        )}
      </div>

      {isError && (
        <div className="text-sm text-destructive">
          Failed to load linked entities.
        </div>
      )}

      {!isLoading && !isError && entries.length === 0 && (
        <div className="text-sm text-muted-foreground">
          No linked entities yet.
        </div>
      )}

      <div className="space-y-2">
        {entries.map((row) => {
          const toType = row?.to?.type;
          const toId = row?.to?.id;

          const entity = row?.to?.entity?.data;
          const title = entity?.title ?? entity?.name ?? toId ?? "-";
          const description = entity?.description ?? "";

          return (
            <div
              key={row._id}
              className="border rounded-lg p-3 flex items-start justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="uppercase text-[10px]">
                    {String(toType ?? "-")}
                  </Badge>
                  <div className="text-sm font-medium break-words truncate">
                    {title}
                  </div>
                </div>
                <div className="text-[11px] font-mono text-muted-foreground break-all">
                  {toId}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => {
                  if (!toType || !toId) return;
                  openConfirm(toType, toId, title);
                }}
                disabled={!toType || !toId || isRemoving}
                aria-label="Remove link"
                title="Remove link"
              >
                {isRemoving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 text-red-500" />
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Confirm modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove link?</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              This will remove the link to:
            </div>

            <div className="border rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="uppercase text-[10px]">
                  {selected?.toType ?? "-"}
                </Badge>
                <div className="text-sm font-medium break-words">
                  {selected?.title ?? selected?.toId ?? "-"}
                </div>
              </div>
              <div className="text-[11px] font-mono text-muted-foreground break-all">
                {selected?.toId ?? ""}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={closeConfirm}
                disabled={isRemoving}
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                onClick={() => {
                  if (!selected?.toType || !selected?.toId) return;
                  onRemove(selected.toType, selected.toId);
                }}
                disabled={!selected?.toType || !selected?.toId || isRemoving}
              >
                {isRemoving && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Remove
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
