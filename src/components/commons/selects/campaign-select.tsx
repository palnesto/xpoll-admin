import { endpoints } from "@/api/endpoints";
import InfiniteSelect, { InfiniteSelectProps } from "./base/infinite-select";

// ---- Shared types ----
export type ListingOption<T> = {
  value: string;
  label: string;
  data?: T;
};

type SelectPropsFor<T> = InfiniteSelectProps<T>["selectProps"];

// ---- Campaign ----
export type CampaignListItem = {
  _id: string;
  name?: string;
  title?: string;
  label?: string;
};

type CampaignSelectProps = {
  onChange?: (option: ListingOption<CampaignListItem> | null) => void;
  pageSize?: number;
  placeholder?: string;
  selectProps?: SelectPropsFor<CampaignListItem>;
};

export function CampaignSelect({
  onChange,
  pageSize = 50,
  placeholder = "Search campaign name or goal...",
  selectProps,
}: CampaignSelectProps) {
  return (
    <InfiniteSelect<CampaignListItem>
      route={endpoints.entities.campaigns.advancedListing}
      pageSize={pageSize}
      getFilters={(search) => ({
        name: search || undefined,
        goal: search || undefined,
      })}
      mapItemToOption={(item) => ({
        value: item._id,
        label: item.label ?? item.title ?? item.name ?? item._id,
        data: item,
      })}
      onChange={(opt) =>
        onChange?.(opt as ListingOption<CampaignListItem> | null)
      }
      placeholder={placeholder}
      selectProps={selectProps}
    />
  );
}
