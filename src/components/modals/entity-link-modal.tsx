import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { endpoints } from "@/api/endpoints";
import { useApiMutation } from "@/hooks/useApiMutation";
import { queryClient } from "@/api/queryClient";
import { appToast } from "@/utils/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select as ShadSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  ListingOption,
  TrialListItem,
  TrialSelect,
} from "../commons/selects/trial-select";
import { PollListItem, PollSelect } from "../commons/selects/poll-select";
import {
  CampaignListItem,
  CampaignSelect,
} from "../commons/selects/campaign-select";
import { BlogListItem, BlogSelect } from "../commons/selects/blog-select";

type EntityType = "poll" | "trial" | "campaign" | "blog";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fromType: EntityType;
  fromId: string;
};

export function EntityLinkModal({
  open,
  onOpenChange,
  fromType,
  fromId,
}: Props) {
  const [toType, setToType] = useState<EntityType | "">("");
  const [toId, setToId] = useState<string>("");
  const [toLabel, setToLabel] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setToType("");
    setToId("");
    setToLabel("");
  }, [open]);

  const forwardUrl = useMemo(
    () => endpoints.entities.entityLink.listForward(fromType, fromId),
    [fromType, fromId],
  );

  // ✅ canonical key
  const forwardQueryKey = useMemo(() => ["GET", forwardUrl], [forwardUrl]);

  const invalidateForward = async () => {
    await queryClient.invalidateQueries({ queryKey: forwardQueryKey });
    await queryClient.refetchQueries({
      queryKey: forwardQueryKey,
      type: "active",
    });
  };

  const { mutate: addLink, isPending: isAdding } = useApiMutation<any, any>({
    route: endpoints.entities.entityLink.add,
    method: "POST",
    onSuccess: async () => {
      appToast.success("Link added");
      await invalidateForward();

      // optional: keep modal open so they can add multiple links
      // setToType("");
      // setToId("");
      // setToLabel("");

      // or close modal after add:
      // onOpenChange(false);
    },
    onError: (e: any) => {
      appToast.error(e?.message ?? "Failed to add link");
    },
  });

  const canSubmit = !!fromType && !!fromId && !!toType && !!toId && !isAdding;

  const onClickAdd = () => {
    if (!canSubmit) return;
    addLink({
      from: { type: fromType, _id: fromId },
      to: { type: toType, _id: toId },
    });
  };

  const ToPicker = () => {
    if (!toType) return null;

    if (toType === "trial") {
      return (
        <TrialSelect
          placeholder="Select trial..."
          onChange={(opt: ListingOption<TrialListItem> | null) => {
            setToId(opt?.value ?? "");
            setToLabel(opt?.label ?? "");
          }}
        />
      );
    }

    if (toType === "poll") {
      return (
        <PollSelect
          placeholder="Select poll..."
          onChange={(opt: ListingOption<PollListItem> | null) => {
            setToId(opt?.value ?? "");
            setToLabel(opt?.label ?? "");
          }}
        />
      );
    }

    if (toType === "campaign") {
      return (
        <CampaignSelect
          placeholder="Select campaign..."
          onChange={(opt: ListingOption<CampaignListItem> | null) => {
            setToId(opt?.value ?? "");
            setToLabel(opt?.label ?? "");
          }}
        />
      );
    }

    if (toType === "blog") {
      return (
        <BlogSelect
          placeholder="Select blog..."
          onChange={(opt: ListingOption<BlogListItem> | null) => {
            setToId(opt?.value ?? "");
            setToLabel(opt?.label ?? "");
          }}
        />
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="flex px-5 py-4 border-b">
          <DialogTitle className="text-base">Link Entity</DialogTitle>
        </DialogHeader>

        <div className="px-5 py-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* FROM */}
            <div className="space-y-3">
              <div className="text-sm font-semibold">From</div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Input value={fromType} disabled />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">ID</Label>
                <Input value={fromId} disabled />
              </div>
            </div>

            {/* TO */}
            <div className="space-y-3">
              <div className="text-sm font-semibold">To</div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <ShadSelect
                  value={toType}
                  onValueChange={(v) => {
                    setToType(v as EntityType);
                    setToId("");
                    setToLabel("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="poll">Poll</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="campaign">Campaign</SelectItem>
                    <SelectItem value="blog">Blog</SelectItem>
                  </SelectContent>
                </ShadSelect>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Select entity
                </Label>
                <ToPicker />
              </div>

              {!!toId && (
                <div className="text-xs text-muted-foreground">
                  Selected: <span className="font-medium">{toLabel}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isAdding}
            >
              Cancel
            </Button>

            <Button onClick={onClickAdd} disabled={!canSubmit}>
              {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
