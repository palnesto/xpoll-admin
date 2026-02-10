import React from "react";
import Select from "react-select";
import InfiniteSelect from "@/components/commons/selects/base/infinite-select";
import { endpoints } from "@/api/endpoints";

type AdOwnerItem = {
  _id: string;
  name: string;
  description?: string | null;
  archivedAt?: string | null;
};

type BaseOption<T = unknown> = { value: string; label: string; data?: T };

type Props = {
  onChange?: (opt: BaseOption<AdOwnerItem> | null) => void;
  placeholder?: string;
  pageSize?: number;
  minChars?: number;
  debounceMs?: number;

  /**
   * Used to prevent picking already-selected ones.
   * (We still guard in onChange in the page too.)
   */
  excludeIds?: string[];

  selectProps?: Partial<
    React.ComponentProps<typeof Select<BaseOption<AdOwnerItem>>>
  >;
};

export default function AdOwnerInfiniteSelect({
  onChange,
  placeholder = "Search ad owners...",
  pageSize = 50,
  minChars = 0,
  debounceMs = 300,
  excludeIds,
  selectProps,
}: Props) {
  return (
    <InfiniteSelect<AdOwnerItem, Record<string, unknown>>
      route={endpoints.entities.ad.adOwners.advancedListing}
      pageSize={pageSize}
      debounceMs={debounceMs}
      minChars={minChars}
      fetchTrigger="open"
      getFilters={(search) => {
        const f: Record<string, unknown> = {
          includeArchived: true, // allow selecting even archived ones (still fine to exclude)
        };

        if (search?.trim()) f.name = search.trim();

        // If your API supports excludeIds for listing results, pass it to avoid showing already selected.
        // If API ignores it, no harm.
        if (excludeIds?.length) f.excludeIds = excludeIds.join(",");

        return f;
      }}
      mapItemToOption={(item) => ({
        value: item._id,
        label: item.name,
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
