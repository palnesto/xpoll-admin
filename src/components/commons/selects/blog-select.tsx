import { endpoints } from "@/api/endpoints";
import InfiniteSelect, { InfiniteSelectProps } from "./base/infinite-select";

export type ListingOption<T> = {
  value: string;
  label: string;
  data?: T;
};

type SelectPropsFor<T> = InfiniteSelectProps<T>["selectProps"];

export type BlogListItem = {
  _id: string;
  title?: string;
  label?: string;
};

type BlogSelectProps = {
  onChange?: (option: ListingOption<BlogListItem> | null) => void;
  pageSize?: number;
  placeholder?: string;
  selectProps?: SelectPropsFor<BlogListItem>;
};

export function BlogSelect({
  onChange,
  pageSize = 50,
  placeholder = "Search blog by title...",
  selectProps,
}: BlogSelectProps) {
  return (
    <InfiniteSelect<BlogListItem>
      route={endpoints.entities.blogs.advancedListing}
      pageSize={pageSize}
      getFilters={(search) => ({ title: search })}
      mapItemToOption={(item) => ({
        value: item._id,
        label: item.label ?? item.title ?? item._id,
        data: item,
      })}
      onChange={(opt) => onChange?.(opt as ListingOption<BlogListItem> | null)}
      placeholder={placeholder}
      selectProps={selectProps}
    />
  );
}
