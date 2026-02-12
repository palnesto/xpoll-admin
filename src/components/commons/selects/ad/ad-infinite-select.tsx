import React from "react";
import Select from "react-select";
import InfiniteSelect from "@/components/commons/selects/base/infinite-select";

type AdItem = {
  _id: string;
  title: string;
  description?: string | null;
  archivedAt?: string | null;
  status?: "draft" | "scheduled" | "live" | "ended";
};

type BaseOption<T = unknown> = { value: string; label: string; data?: T };

type Props = {
  onChange?: (opt: BaseOption<AdItem> | null) => void;
  placeholder?: string;
  pageSize?: number;
  minChars?: number;
  debounceMs?: number;

  queryParams?: Record<string, unknown>;
  getQueryParams?: (search: string) => Record<string, unknown>;

  selectProps?: Partial<
    React.ComponentProps<typeof Select<BaseOption<AdItem>>>
  >;
};

export default function AdInfiniteSelect({
  onChange,
  placeholder = "Search ads...",
  pageSize = 50,
  minChars = 0,
  debounceMs = 300,
  queryParams,
  getQueryParams,
  selectProps,
}: Props) {
  return (
    <InfiniteSelect<AdItem, Record<string, unknown>>
      route={"/internal/advertisement/ad/advanced-listing"}
      pageSize={pageSize}
      debounceMs={debounceMs}
      minChars={minChars}
      fetchTrigger="open"
      getFilters={(search) => {
        const base = getQueryParams
          ? getQueryParams(search)
          : { ...(queryParams ?? {}) };

        // map search -> title (backend supports title filter)
        const s = search?.trim();
        if (s) (base as any).title = s;
        else delete (base as any).title;

        return base as Record<string, unknown>;
      }}
      mapItemToOption={(item) => ({
        value: item._id,
        label: item.title,
        data: item,
      })}
      onChange={onChange as any}
      placeholder={placeholder}
      selectProps={{
        ...selectProps,
        menuPortalTarget: selectProps?.menuPortalTarget ?? document.body,
      }}
    />
  );
}
