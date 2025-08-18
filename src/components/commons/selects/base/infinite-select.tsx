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
  F extends Record<string, unknown> = Record<string, unknown>
> = {
  route: string;
  pageSize?: number;
  getFilters?: (search: string) => F; // build filters from debounced search
  mapItemToOption: (item: T) => BaseOption<T>;
  onChange?: (option: BaseOption<T> | null) => void;
  placeholder?: string;
  isClearable?: boolean;
  selectProps?: Partial<React.ComponentProps<typeof Select<BaseOption<T>>>>;
  debounceMs?: number; // debounce for querying
  minChars?: number; // type-to-search gate (optional)
  fetchThresholdPx?: number; // prefetch when within X px of bottom
};

export default function InfiniteSelect<
  T,
  F extends Record<string, unknown> = Record<string, unknown>
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
}: InfiniteSelectProps<T, F>) {
  // 1) Immediate input for smooth typing
  const [input, setInput] = React.useState("");
  // 2) Debounced value that actually triggers API calls
  const [search, setSearch] = React.useState("");

  // Debounce: whenever `input` changes, update `search` after N ms
  React.useEffect(() => {
    const id = window.setTimeout(() => setSearch(input), debounceMs);
    return () => window.clearTimeout(id);
  }, [input, debounceMs]);

  // Build filters from debounced search
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
      for (const item of p.entries as T[]) {
        flat.push(mapItemToOption(item));
      }
    }
    return flat;
  }, [data, mapItemToOption]);

  const handleChange = React.useCallback(
    (v: SingleValue<BaseOption<T>>) => onChange?.(v ?? null),
    [onChange]
  );

  // Controlled input: update `input` immediately (smooth typing)
  const handleInputChange = React.useCallback(
    (val: string, meta: { action: string }) => {
      if (meta.action === "input-change") setInput(val);
      return val; // react-select requirement
    },
    []
  );

  // Infinite scroll: custom MenuList that fetches when near bottom
  const lastFetchTsRef = React.useRef(0);
  const tryFetchNext = React.useCallback(() => {
    const now = Date.now();
    if (now - lastFetchTsRef.current < 300) return; // throttle
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
      // bind to immediate input state (NOT debounced)
      inputValue={input}
      onInputChange={handleInputChange}
      onChange={handleChange}
      // make sure the menu actually scrolls
      maxMenuHeight={260}
      filterOption={() => true} // server-side filtering
      isLoading={isLoading || isFetchingNextPage}
      noOptionsMessage={() =>
        isLoading
          ? "Loading..."
          : input && input.length < minChars
          ? `Type at least ${minChars} characters`
          : "No options"
      }
      // keep your existing portal config etc.
      menuPortalTarget={selectProps?.menuPortalTarget}
      menuShouldScrollIntoView={false}
      components={{ MenuList, ...(selectProps?.components || {}) }}
      {...selectProps}
    />
  );
}
