import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { BuyConfigItemEditor } from "./buy-config-item-editor";
import type {
  BuyConfigUpdateBody,
  Limits,
  ManagedItem,
  SectionKey,
} from "../types";
import { itemKey, resolveAssetImage } from "../utils";

type BuyConfigAccordionListProps = {
  activeTab: SectionKey;
  items: ManagedItem[];
  limits: Limits;
  openItems: string[];
  onOpenItemsChange: (items: string[]) => void;
  savingKey: string | null;
  isMutationPending: boolean;
  onSave: (item: ManagedItem, body: BuyConfigUpdateBody) => Promise<void>;
};

export function BuyConfigAccordionList({
  activeTab,
  items,
  limits,
  openItems,
  onOpenItemsChange,
  savingKey,
  isMutationPending,
  onSave,
}: BuyConfigAccordionListProps) {
  return (
    <Accordion
      type="multiple"
      className="w-full"
      value={openItems}
      onValueChange={onOpenItemsChange}
    >
      {items.map((item) => {
        const key = itemKey(item);
        const isSaving = savingKey === key && isMutationPending;
        const imageUrl = resolveAssetImage(item);
        const shouldFade =
          (activeTab === "assets" || activeTab === "offlineProducts") &&
          item.buyConfig.enable === false;

        return (
          <AccordionItem
            key={key}
            value={key}
            className={[
              "border-zinc-800 transition-opacity",
              shouldFade ? "opacity-50" : "opacity-100",
            ].join(" ")}
          >
            <AccordionTrigger className="hover:no-underline">
              <div className="flex w-full items-center justify-between pr-4 gap-3">
                <div className="text-left flex items-center gap-3">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={item.title}
                      className="h-8 w-8 rounded-full object-cover border border-zinc-700/70 bg-zinc-900/40"
                      loading="lazy"
                    />
                  ) : null}

                  <div>
                    <div className="text-sm font-semibold">{item.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.subtitle}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={item.buyConfig.enable ? "default" : "secondary"}>
                    {item.buyConfig.enable ? "Enabled" : "Disabled"}
                  </Badge>
                  {item.chain ? <Badge variant="outline">{item.chain}</Badge> : null}
                  {typeof item.isActive === "boolean" ? (
                    <Badge variant={item.isActive ? "secondary" : "outline"}>
                      {item.isActive ? "Active" : "Inactive"}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent>
              <BuyConfigItemEditor
                item={item}
                limits={limits}
                isSaving={isSaving}
                onSave={onSave}
              />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
