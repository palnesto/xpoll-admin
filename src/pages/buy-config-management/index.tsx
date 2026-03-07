import { endpoints } from "@/api/endpoints";
import apiInstance from "@/api/queryClient";
import { useApiQuery } from "@/hooks/useApiQuery";
import { appToast } from "@/utils/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FALLBACK_LIMITS } from "./constants";
import { BuyConfigErrorState } from "./components/buy-config-error-state";
import { BuyConfigLoadingState } from "./components/buy-config-loading-state";
import { BuyConfigPageHeader } from "./components/buy-config-page-header";
import { BuyConfigSectionCard } from "./components/buy-config-section-card";
import { BuyConfigTabs } from "./components/buy-config-tabs";
import type {
  BuyConfigPayload,
  BuyConfigUpdateBody,
  EntityType,
  ManagedItem,
  SectionKey,
} from "./types";
import { buildSections, itemKey, sortItemsForDisplay } from "./utils";

export default function BuyConfigManagementPage() {
  const queryClient = useQueryClient();

  const buyConfigQuery = useApiQuery(endpoints.buyConfigManagement.list, {
    refetchOnWindowFocus: false,
  });

  const payload = (buyConfigQuery.data?.data?.data ??
    null) as BuyConfigPayload | null;

  const limits = payload?.limits ?? FALLBACK_LIMITS;
  const [activeTab, setActiveTab] = useState<SectionKey>("assets");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);

  const updateMutation = useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      body,
    }: {
      entityType: EntityType;
      entityId: string;
      body: BuyConfigUpdateBody;
    }) => {
      const route = endpoints.buyConfigManagement.update(entityType, entityId);
      const response = await apiInstance.patch(route, body);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["GET", endpoints.buyConfigManagement.list],
      });
    },
  });

  const onSaveItem = async (item: ManagedItem, body: BuyConfigUpdateBody) => {
    const key = itemKey(item);
    setSavingKey(key);

    try {
      await updateMutation.mutateAsync({
        entityType: item.entityType,
        entityId: item.entityId,
        body,
      });

      setOpenAccordionItems((prev) => prev.filter((value) => value !== key));
      appToast.success(`Updated buy config for ${item.title}`);
    } finally {
      setSavingKey(null);
    }
  };

  const sections = useMemo(() => buildSections(payload), [payload]);
  const activeSection = sections[activeTab];
  const visibleItems = useMemo(
    () => sortItemsForDisplay(activeSection.items, activeTab),
    [activeSection.items, activeTab],
  );

  return (
    <section className="p-4 space-y-4 @container/main flex flex-1 flex-col">
      <BuyConfigPageHeader limits={limits} />

      {buyConfigQuery.isLoading ? <BuyConfigLoadingState /> : null}

      {!buyConfigQuery.isLoading && buyConfigQuery.isError ? (
        <BuyConfigErrorState onRetry={() => buyConfigQuery.refetch()} />
      ) : null}

      {!buyConfigQuery.isLoading && !buyConfigQuery.isError ? (
        <>
          <BuyConfigTabs
            activeTab={activeTab}
            sections={sections}
            onTabChange={setActiveTab}
          />

          <BuyConfigSectionCard
            activeTab={activeTab}
            section={activeSection}
            visibleItems={visibleItems}
            limits={limits}
            openAccordionItems={openAccordionItems}
            onOpenAccordionItemsChange={setOpenAccordionItems}
            savingKey={savingKey}
            isMutationPending={updateMutation.isPending}
            onSave={onSaveItem}
          />
        </>
      ) : null}
    </section>
  );
}
