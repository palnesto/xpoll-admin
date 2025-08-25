import React from "react";
import Select, { components } from "react-select";
import { useSlugViewStore } from "@/stores/slug.store";
import InfiniteSelect from "./base/infinite-select";
import { SlugCreateModal } from "@/components/modals/slug/create";
import { endpoints } from "@/api/endpoints";

type SlugItem = { _id: string; name: string; archivedAt?: string | null };
type BaseOption<T = unknown> = { value: string; label: string; data?: T };

type Props = {
  value?: BaseOption<SlugItem> | null;
  onChange?: (option: BaseOption<SlugItem> | null) => void;
  placeholder?: string;
  pageSize?: number;
  selectProps?: Partial<
    React.ComponentProps<typeof Select<BaseOption<SlugItem>>>
  >;
  minChars?: number;
};

export function SlugCreatableSelect({
  value,
  onChange,
  placeholder = "Search slug...",
  pageSize = 50,
  selectProps,
  minChars = 0,
}: Props) {
  const setIsAddSlug = useSlugViewStore((s) => s.setIsAddSlug);

  const NoOptionsMessage = (
    props: NoOptionsMessageProps<BaseOption<SlugItem>, false>
  ) => {
    const typed = (props.selectProps.inputValue || "").trim().toLowerCase();
    if (!typed || typed.length < (minChars || 0)) {
      return (
        <components.NoOptionsMessage {...props}>
          No options
        </components.NoOptionsMessage>
      );
    }
    return (
      <components.NoOptionsMessage {...props}>
        <div className="flex flex-col gap-2">
          <span>No matches</span>
          <button
            type="button"
            className="rounded-md border border-white/10 px-2 py-1 text-sm hover:bg-white/10"
            onMouseDown={(e) => {
              e.preventDefault();
              setIsAddSlug(typed);
            }}
          >
            Create slug &ldquo;{typed}&rdquo;
          </button>
        </div>
      </components.NoOptionsMessage>
    );
  };

  const handleCreated = React.useCallback(
    (opt: BaseOption<SlugItem>) => {
      onChange?.(opt);
    },
    [onChange]
  );

  return (
    <>
      <InfiniteSelect<SlugItem>
        route={endpoints.entities.slug.create}
        pageSize={pageSize}
        getFilters={(search) => ({ q: search })}
        mapItemToOption={(item) => ({
          value: item._id,
          label: item.name,
          data: item,
        })}
        onChange={onChange}
        placeholder={placeholder}
        minChars={minChars}
        selectProps={{
          ...selectProps,
          components: {
            NoOptionsMessage,
            ...(selectProps?.components || {}),
          },
        }}
      />

      <SlugCreateModal onCreated={handleCreated} />
    </>
  );
}
