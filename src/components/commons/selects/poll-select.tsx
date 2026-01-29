import { endpoints } from "@/api/endpoints";
import InfiniteSelect, { InfiniteSelectProps } from "./base/infinite-select";

export type ListingOption<T> = {
  value: string;
  label: string;
  data?: T;
};

type SelectPropsFor<T> = InfiniteSelectProps<T>["selectProps"];

export type PollListItem = {
  _id: string;
  title?: string;
  statement?: string;
  label?: string;
};

type PollSelectProps = {
  onChange?: (option: ListingOption<PollListItem> | null) => void;
  pageSize?: number;
  placeholder?: string;
  selectProps?: SelectPropsFor<PollListItem>;
};

export function PollSelect({
  onChange,
  pageSize = 50,
  placeholder = "Search poll by title or description...",
  selectProps,
}: PollSelectProps) {
  return (
    <InfiniteSelect<PollListItem>
      route={endpoints.entities.polls.advancedListing}
      pageSize={pageSize}
      getFilters={(search) => ({
        title: search || undefined,
        description: search || undefined,
      })}
      mapItemToOption={(item) => ({
        value: item._id,
        label: item.label ?? item.title ?? item.statement ?? item._id,
        data: item,
      })}
      onChange={(opt) => onChange?.(opt as ListingOption<PollListItem> | null)}
      placeholder={placeholder}
      selectProps={selectProps}
    />
  );
}
