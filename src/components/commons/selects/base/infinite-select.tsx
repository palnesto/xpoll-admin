// src/components/InfiniteSelect.tsx
import { useApiInfiniteQuery } from "@/hooks/useApiInfiniteQuery";
import React from "react";
import Select, { components, MenuListProps, SingleValue } from "react-select";

type BaseOption<T = unknown> = {
  value: string;
  label: string;
  data?: T;
};

export type InfiniteSelectProps<
  T,
  F extends Record<string, unknown> = Record<string, unknown>,
> = {
  route: string;
  pageSize?: number;
  getFilters?: (search: string) => F;
  mapItemToOption: (item: T) => BaseOption<T>;
  onChange?: (option: BaseOption<T> | null) => void;
  placeholder?: string;
  isClearable?: boolean;
  selectProps?: Partial<React.ComponentProps<typeof Select<BaseOption<T>>>>;
  debounceMs?: number;
  minChars?: number;
  fetchThresholdPx?: number;
  /** When to start fetching data: "open" (on menu open) or "type" (after typing minChars). */
  fetchTrigger?: "open" | "type";
};

export default function InfiniteSelect<
  T,
  F extends Record<string, unknown> = Record<string, unknown>,
>({
  route,
  pageSize = 50,
  getFilters,
  mapItemToOption,
  onChange,
  placeholder = "Search...",
  isClearable = true,
  selectProps,
  debounceMs = 300,
  minChars = 0,
  fetchThresholdPx = 120,
  fetchTrigger = "open",
}: InfiniteSelectProps<T, F>) {
  const [input, setInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  // Debounce the user's input into "search"
  React.useEffect(() => {
    const id = window.setTimeout(() => setSearch(input), debounceMs);
    return () => window.clearTimeout(id);
  }, [input, debounceMs]);

  const effectiveSearch = search.length >= minChars ? search : "";

  // Keep an empty filters object stable to avoid changing the queryKey unnecessarily
  const emptyFiltersRef = React.useRef({} as F);
  const filters = React.useMemo(
    () => (getFilters ? getFilters(effectiveSearch) : emptyFiltersRef.current),
    [getFilters, effectiveSearch],
  );

  // Only enable the query when the user is "using" the select
  const enabled =
    fetchTrigger === "open" ? isOpen : isOpen && effectiveSearch.length > 0;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useApiInfiniteQuery<T, unknown, F>(route, filters, pageSize, {
      enabled,
      // Optional: keep previous data while typing/opening for smoother UI
      keepPreviousData: true,
    });

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
    (v: SingleValue<BaseOption<T>>) => onChange?.(v ?? null),
    [onChange],
  );

  const handleInputChange = React.useCallback(
    (val: string, meta: { action: string }) => {
      if (meta.action === "input-change") setInput(val);
      return val;
    },
    [],
  );

  // Throttled infinite scroll fetcher
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
    const Comp = (props: MenuListProps<BaseOption<T>, false>) => {
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
    <Select<BaseOption<T>>
      placeholder={placeholder}
      isClearable={isClearable}
      options={options}
      inputValue={input}
      onInputChange={handleInputChange}
      onChange={handleChange}
      maxMenuHeight={260}
      filterOption={() => true}
      // Only show spinner once fetching is actually enabled
      isLoading={enabled && (isLoading || isFetchingNextPage)}
      noOptionsMessage={() => {
        if (!enabled) {
          if (fetchTrigger === "type" && input.length < minChars) {
            return `Type at least ${minChars} characters`;
          }
          return "Open the menu to load options";
        }
        if (isLoading) return "Loading...";
        if (fetchTrigger === "type" && input.length < minChars) {
          return `Type at least ${minChars} characters`;
        }
        return "No options";
      }}
      onMenuOpen={() => setIsOpen(true)}
      onMenuClose={() => setIsOpen(false)}
      menuPortalTarget={selectProps?.menuPortalTarget}
      menuShouldScrollIntoView={false}
      components={{ MenuList, ...(selectProps?.components || {}) }}
      styles={{
        control: (base, state) => ({
          ...base,
          backgroundColor: "transparent", // ✅ transparent input
          boxShadow: "none",
          borderColor: state.isFocused ? "" : "",
        }),
        input: (base) => ({
          ...base,
          color: "#fff", // ✅ typed text stays black
        }),
        option: (provided, state) => ({
          ...provided,
          color: "black",
          backgroundColor: state.isFocused
            ? "#e6e6e6" // focused option
            : state.isSelected
              ? "#e6e6e6" // selected option
              : "white",
        }),

        singleValue: (provided) => ({
          ...provided,
          color: "#fff", // ✅ typed text stays black
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
