import { endpoints } from "@/api/endpoints";
import InfiniteSelect, { InfiniteSelectProps } from "./base/infinite-select";

export type ListingOption<T> = {
  value: string;
  label: string;
  data?: T;
};

type SelectPropsFor<T> = InfiniteSelectProps<T>["selectProps"];

export type ExternalAccountListItem = {
  _id: string;
  name?: string;
  title?: string;
  label?: string;
};

type ExternalAccountSelectProps = {
  onChange?: (option: ListingOption<ExternalAccountListItem> | null) => void;
  pageSize?: number;
  placeholder?: string;
  selectProps?: SelectPropsFor<ExternalAccountListItem>;
};

export function ExternalAccountSelect({
  onChange,
  pageSize = 50,
  placeholder = "Search user...",
  selectProps,
}: ExternalAccountSelectProps) {
  return (
    <InfiniteSelect<ExternalAccountListItem>
      route={endpoints.users.all}
      pageSize={pageSize}
      getFilters={(search) => ({
        q: search || undefined,
      })}
      mapItemToOption={(item) => ({
        value: item._id,
        label: item.label ?? item.title ?? item.name ?? item._id,
        data: item,
      })}
      onChange={(opt) =>
        onChange?.(opt as ListingOption<ExternalAccountListItem> | null)
      }
      placeholder={placeholder}
      selectProps={selectProps}
    />
  );
}
