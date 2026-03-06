import { TAB_ORDER } from "../constants";
import type { SectionKey, SectionMap } from "../types";

type BuyConfigTabsProps = {
  activeTab: SectionKey;
  sections: SectionMap;
  onTabChange: (tab: SectionKey) => void;
};

export function BuyConfigTabs({
  activeTab,
  sections,
  onTabChange,
}: BuyConfigTabsProps) {
  return (
    <div className="inline-flex w-full rounded-xl border border-zinc-800 bg-zinc-900/30 p-1 gap-1 overflow-x-auto">
      {TAB_ORDER.map((tab) => {
        const count = sections[tab.key].items.length;
        const selected = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            className={[
              "flex-1 min-w-[180px] rounded-lg px-3 py-2 text-sm transition",
              selected
                ? "bg-zinc-100 text-zinc-900 font-semibold"
                : "bg-transparent text-zinc-300 hover:bg-zinc-800/60",
            ].join(" ")}
            onClick={() => onTabChange(tab.key)}
          >
            <span>{tab.label}</span>
            <span className="ml-2 text-xs opacity-80">({count})</span>
          </button>
        );
      })}
    </div>
  );
}
