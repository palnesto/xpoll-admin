import { useApiInfiniteQuery } from "@/hooks/useApiInfiniteQuery";
import React from "react";
import Select, {
  components,
  MenuListProps,
  MultiValue,
  GroupBase,
} from "react-select";

type BaseOption<T = unknown> = {
  value: string;
  label: string;
  data?: T;
};

export type MultiInfiniteSelectProps<
  T,
  F extends Record<string, unknown> = Record<string, unknown>
> = {
  route: string;
  pageSize?: number;
  getFilters?: (search: string) => F;
  mapItemToOption: (item: T) => BaseOption<T>;
  value?: BaseOption<T>[];
  onChange?: (options: BaseOption<T>[]) => void;
  placeholder?: string;
  isClearable?: boolean;
  selectProps?: Partial<
    React.ComponentProps<
      typeof Select<BaseOption<T>, true, GroupBase<BaseOption<T>>>
    >
  >;
  debounceMs?: number;
  minChars?: number;
  fetchThresholdPx?: number;
};

export default function MultiInfiniteSelect<
  T,
  F extends Record<string, unknown> = Record<string, unknown>
>({
  route,
  pageSize = 50,
  getFilters,
  mapItemToOption,
  value,
  onChange,
  placeholder = "Search...",
  isClearable = true,
  selectProps,
  debounceMs = 300,
  minChars = 0,
  fetchThresholdPx = 120,
}: MultiInfiniteSelectProps<T, F>) {
  const [input, setInput] = React.useState("");
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    const id = window.setTimeout(() => setSearch(input), debounceMs);
    return () => window.clearTimeout(id);
  }, [input, debounceMs]);

  const effectiveSearch = search.length >= minChars ? search : "";
  const filters = React.useMemo(
    () => (getFilters ? getFilters(effectiveSearch) : ({} as F)),
    [getFilters, effectiveSearch]
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useApiInfiniteQuery<T, unknown, F>(route, filters, pageSize);

  const options = React.useMemo(() => {
    const pages = data?.pages ?? [];
    const flat: BaseOption<T>[] = [];
    for (const p of pages) {
      for (const item of (p as any).entries as T[]) {
        flat.push(mapItemToOption(item));
      }
    }
    return flat;
  }, [data, mapItemToOption]);

  const handleChange = React.useCallback(
    (v: MultiValue<BaseOption<T>>) => onChange?.(v as BaseOption<T>[]),
    [onChange]
  );

  const handleInputChange = React.useCallback(
    (val: string, meta: { action: string }) => {
      if (meta.action === "input-change") setInput(val);
      return val;
    },
    []
  );

  const lastFetchTsRef = React.useRef(0);
  const tryFetchNext = React.useCallback(() => {
    const now = Date.now();
    if (now - lastFetchTsRef.current < 300) return;
    if (hasNextPage && !isFetchingNextPage) {
      lastFetchTsRef.current = now;
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const MenuList = React.useMemo(() => {
    const Comp = (props: MenuListProps<BaseOption<T>, true>) => {
      const onScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
        const el = e.currentTarget;
        const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
        if (distance < fetchThresholdPx) tryFetchNext();
      };
      return (
        <components.MenuList {...props} onScroll={onScroll}>
          {props.children}
        </components.MenuList>
      );
    };
    return Comp;
  }, [fetchThresholdPx, tryFetchNext]);

  return (
    <Select<BaseOption<T>, true>
      isMulti
      placeholder={placeholder}
      isClearable={isClearable}
      options={options}
      value={value}
      inputValue={input}
      onInputChange={handleInputChange}
      onChange={handleChange}
      maxMenuHeight={260}
      filterOption={() => true}
      isLoading={isLoading || isFetchingNextPage}
      noOptionsMessage={() =>
        isLoading
          ? "Loading..."
          : input && input.length < minChars
          ? `Type at least ${minChars} characters`
          : "No options"
      }
      menuPortalTarget={selectProps?.menuPortalTarget}
      menuShouldScrollIntoView={false}
      components={{ MenuList, ...(selectProps?.components || {}) }}
      styles={{
        option: (provided, state) => ({
          ...provided,
          color: "black",
          backgroundColor: state.isFocused
            ? "#f0f0f0" // hover effect
            : state.isSelected
            ? "#e6e6e6" // selected option
            : "white",
        }),
        singleValue: (provided) => ({
          ...provided,
          color: "black",
        }),
        multiValueLabel: (provided) => ({
          ...provided,
          color: "black",
        }),
      }}
      {...selectProps}
    />
  );
}
