import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BuyConfigAccordionList } from "./buy-config-accordion-list";
import type {
  BuyConfigUpdateBody,
  Limits,
  ManagedItem,
  SectionDefinition,
  SectionKey,
} from "../types";

type BuyConfigSectionCardProps = {
  activeTab: SectionKey;
  section: SectionDefinition;
  visibleItems: ManagedItem[];
  limits: Limits;
  openAccordionItems: string[];
  onOpenAccordionItemsChange: (items: string[]) => void;
  savingKey: string | null;
  isMutationPending: boolean;
  onSave: (item: ManagedItem, body: BuyConfigUpdateBody) => Promise<void>;
};

export function BuyConfigSectionCard({
  activeTab,
  section,
  visibleItems,
  limits,
  openAccordionItems,
  onOpenAccordionItemsChange,
  savingKey,
  isMutationPending,
  onSave,
}: BuyConfigSectionCardProps) {
  return (
    <Card className="border border-zinc-800 rounded-2xl bg-sidebar/60">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span>{section.title}</span>
          <Badge variant="secondary">{section.items.length}</Badge>
        </CardTitle>
        <CardDescription>{section.description}</CardDescription>
      </CardHeader>

      <CardContent>
        {section.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries found.</p>
        ) : (
          <BuyConfigAccordionList
            activeTab={activeTab}
            items={visibleItems}
            limits={limits}
            openItems={openAccordionItems}
            onOpenItemsChange={onOpenAccordionItemsChange}
            savingKey={savingKey}
            isMutationPending={isMutationPending}
            onSave={onSave}
          />
        )}
      </CardContent>
    </Card>
  );
}
