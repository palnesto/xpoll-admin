// // src/components/MultiInfiniteSelect.tsx
// import { useApiInfiniteQuery } from "@/hooks/useApiInfiniteQuery";
// import React from "react";
// import Select, {
//   components,
//   MenuListProps,
//   MultiValue,
//   GroupBase,
// } from "react-select";

// type BaseOption<T = unknown> = {
//   value: string;
//   label: string;
//   data?: T;
// };

// export type MultiInfiniteSelectProps<
//   T,
//   F extends Record<string, unknown> = Record<string, unknown>
// > = {
//   route: string;
//   pageSize?: number;
//   getFilters?: (search: string) => F;
//   mapItemToOption: (item: T) => BaseOption<T>;
//   value?: BaseOption<T>[];
//   onChange?: (options: BaseOption<T>[]) => void;
//   placeholder?: string;
//   isClearable?: boolean;
//   selectProps?: Partial<
//     React.ComponentProps<
//       typeof Select<BaseOption<T>, true, GroupBase<BaseOption<T>>>
//     >
//   >;
//   debounceMs?: number;
//   minChars?: number;
//   fetchThresholdPx?: number;
//   /** When to start fetching data: "open" (on menu open) or "type" (after typing minChars). */
//   fetchTrigger?: "open" | "type";
// };

// export default function MultiInfiniteSelect<
//   T,
//   F extends Record<string, unknown> = Record<string, unknown>
// >({
//   route,
//   pageSize = 50,
//   getFilters,
//   mapItemToOption,
//   value,
//   onChange,
//   placeholder = "Search...",
//   isClearable = true,
//   selectProps,
//   debounceMs = 300,
//   minChars = 0,
//   fetchThresholdPx = 120,
//   fetchTrigger = "open",
// }: MultiInfiniteSelectProps<T, F>) {
//   const [input, setInput] = React.useState("");
//   const [search, setSearch] = React.useState("");
//   const [isOpen, setIsOpen] = React.useState(false);

//   // Debounce the user's input into "search"
//   React.useEffect(() => {
//     const id = window.setTimeout(() => setSearch(input), debounceMs);
//     return () => window.clearTimeout(id);
//   }, [input, debounceMs]);

//   const effectiveSearch = search.length >= minChars ? search : "";

//   // Keep an empty filters object stable to avoid changing the queryKey unnecessarily
//   const emptyFiltersRef = React.useRef({} as F);
//   const filters = React.useMemo(
//     () => (getFilters ? getFilters(effectiveSearch) : emptyFiltersRef.current),
//     [getFilters, effectiveSearch]
//   );

//   // Only enable the query when the user is "using" the select
//   const enabled =
//     fetchTrigger === "open" ? isOpen : isOpen && effectiveSearch.length > 0;

//   const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
//     useApiInfiniteQuery<T, unknown, F>(route, filters, pageSize, {
//       enabled,
//       keepPreviousData: true,
//     });

//   const options = React.useMemo(() => {
//     const pages = data?.pages ?? [];
//     const flat: BaseOption<T>[] = [];
//     for (const p of pages) {
//       for (const item of (p as any).entries as T[]) {
//         flat.push(mapItemToOption(item));
//       }
//     }
//     return flat;
//   }, [data, mapItemToOption]);

//   const handleChange = React.useCallback(
//     (v: MultiValue<BaseOption<T>>) => onChange?.(v as BaseOption<T>[]),
//     [onChange]
//   );

//   const handleInputChange = React.useCallback(
//     (val: string, meta: { action: string }) => {
//       if (meta.action === "input-change") setInput(val);
//       return val;
//     },
//     []
//   );

//   // Throttled infinite scroll fetcher
//   const lastFetchTsRef = React.useRef(0);
//   const tryFetchNext = React.useCallback(() => {
//     const now = Date.now();
//     if (now - lastFetchTsRef.current < 300) return;
//     if (hasNextPage && !isFetchingNextPage) {
//       lastFetchTsRef.current = now;
//       fetchNextPage();
//     }
//   }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

//   const MenuList = React.useMemo(() => {
//     const Comp = (props: MenuListProps<BaseOption<T>, true>) => {
//       const onScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
//         const el = e.currentTarget;
//         const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
//         if (distance < fetchThresholdPx) tryFetchNext();
//       };
//       return (
//         <components.MenuList {...props} onScroll={onScroll}>
//           {props.children}
//         </components.MenuList>
//       );
//     };
//     return Comp;
//   }, [fetchThresholdPx, tryFetchNext]);

//   return (
//     <Select<BaseOption<T>, true, GroupBase<BaseOption<T>>>
//       isMulti
//       placeholder={placeholder}
//       isClearable={isClearable}
//       options={options}
//       value={value}
//       inputValue={input}
//       onInputChange={handleInputChange}
//       onChange={handleChange}
//       maxMenuHeight={260}
//       filterOption={() => true}
//       // Only show spinner once fetching is actually enabled
//       isLoading={enabled && (isLoading || isFetchingNextPage)}
//       noOptionsMessage={() => {
//         if (!enabled) {
//           if (fetchTrigger === "type" && input.length < minChars) {
//             return `Type at least ${minChars} characters`;
//           }
//           return "Open the menu to load options";
//         }
//         if (isLoading) return "Loading...";
//         if (fetchTrigger === "type" && input.length < minChars) {
//           return `Type at least ${minChars} characters`;
//         }
//         return "No options";
//       }}
//       onMenuOpen={() => setIsOpen(true)}
//       onMenuClose={() => setIsOpen(false)}
//       menuPortalTarget={selectProps?.menuPortalTarget}
//       menuShouldScrollIntoView={false}
//       components={{ MenuList, ...(selectProps?.components || {}) }}
//       styles={{
//         option: (provided, state) => ({
//           ...provided,
//           color: "black",
//           backgroundColor: state.isFocused
//             ? "#f0f0f0" // hover effect
//             : state.isSelected
//             ? "#e6e6e6" // selected option
//             : "white",
//         }),
//         singleValue: (provided) => ({
//           ...provided,
//           color: "black",
//         }),
//         multiValueLabel: (provided) => ({
//           ...provided,
//           color: "black",
//         }),
//       }}
//       {...selectProps}
//     />
//   );
// }
import React from "react";
import { useApiInfiniteQuery } from "@/hooks/useApiInfiniteQuery";
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
  /** When to start fetching data: "open" (on menu open) or "type" (after typing minChars). */
  fetchTrigger?: "open" | "type";
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
  fetchTrigger = "open",
}: MultiInfiniteSelectProps<T, F>) {
  const [input, setInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  // Debounce input -> search
  React.useEffect(() => {
    const id = window.setTimeout(() => setSearch(input), debounceMs);
    return () => window.clearTimeout(id);
  }, [input, debounceMs]);

  const effectiveSearch = search.length >= minChars ? search : "";

  // Stable empty filters
  const emptyFiltersRef = React.useRef({} as F);
  const filters = React.useMemo(
    () => (getFilters ? getFilters(effectiveSearch) : emptyFiltersRef.current),
    [getFilters, effectiveSearch]
  );

  // Only enable when "using" the select
  const enabled =
    fetchTrigger === "open" ? isOpen : isOpen && effectiveSearch.length > 0;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useApiInfiniteQuery<T, unknown, F>(route, filters, pageSize, {
      enabled,
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
    (v: MultiValue<BaseOption<T>>) => {
      onChange?.(v as BaseOption<T>[]);
      setInput("");
      setSearch("");
    },
    [onChange]
  );

  const handleInputChange = React.useCallback(
    (val: string, meta: { action: string }) => {
      if (meta.action === "input-change") setInput(val);
      return val;
    },
    []
  );

  // Throttled infinite scroll
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

  // ---- Dark-friendly styles (works with shadcn tokens + falls back) ----
  const mergeStyles = (
    base: NonNullable<typeof selectProps>["styles"]
  ): NonNullable<typeof selectProps>["styles"] => {
    const fg = "hsl(var(--foreground, 0 0% 100%))"; // white fallback
    const border = "hsl(var(--border, 240 5% 26%))";
    const muted = "hsl(var(--muted, 240 4.8% 15%))";
    const mutedFg = "hsl(var(--muted-foreground, 240 5% 64%))";
    const bg = "hsl(var(--background, 240 10% 4%))";

    const darkStyles = {
      menuPortal: (provided: any) => ({ ...provided, zIndex: 9999 }),
      control: (provided: any) => ({
        ...provided,
        minHeight: 38,
        boxShadow: "none",
        background: "transparent",
        borderColor: border,
        ":hover": { borderColor: border },
        color: fg,
      }),
      valueContainer: (provided: any) => ({
        ...provided,
        background: "transparent",
      }),
      input: (provided: any) => ({
        ...provided,
        color: fg, // search input text
      }),
      placeholder: (provided: any) => ({
        ...provided,
        color: mutedFg,
      }),
      singleValue: (provided: any) => ({
        ...provided,
        color: fg,
      }),
      multiValue: (provided: any) => ({
        ...provided,
        borderRadius: 9999,
        background: muted,
      }),
      multiValueLabel: (provided: any) => ({
        ...provided,
        color: fg,
      }),
      multiValueRemove: (provided: any) => ({
        ...provided,
        color: fg,
        ":hover": {
          background: "hsl(var(--destructive, 0 84% 60%))",
          color: "hsl(var(--destructive-foreground, 0 0% 100%))",
        },
      }),
      dropdownIndicator: (provided: any) => ({
        ...provided,
        color: fg,
        ":hover": { color: fg },
      }),
      clearIndicator: (provided: any) => ({
        ...provided,
        color: fg,
        ":hover": { color: fg },
      }),
      menu: (provided: any) => ({
        ...provided,
        background: "rgba(0,0,0,0.85)", // dark/transparent
        backdropFilter: "blur(4px)",
        border: `1px solid ${border}`,
      }),
      menuList: (provided: any) => ({
        ...provided,
        background: "transparent",
        padding: 4,
      }),
      option: (provided: any, state: any) => ({
        ...provided,
        background: state.isFocused ? muted : "transparent",
        color: fg,
        ":active": { background: muted },
      }),
    };

    if (!base) return darkStyles;

    const keys = new Set([...Object.keys(darkStyles), ...Object.keys(base)]);
    const merged: any = {};
    for (const k of keys) {
      const our = (darkStyles as any)[k];
      const theirs = (base as any)[k];
      if (!theirs) {
        merged[k] = our;
        continue;
      }
      if (!our) {
        merged[k] = theirs;
        continue;
      }
      merged[k] = (provided: any, state: any) => {
        const theirsOut =
          typeof theirs === "function" ? theirs(provided, state) : theirs;
        const ourOut = typeof our === "function" ? our(provided, state) : our;
        return { ...theirsOut, ...ourOut };
      };
    }
    return merged;
  };

  return (
    <Select<BaseOption<T>, true, GroupBase<BaseOption<T>>>
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
      components={{ MenuList, ...(selectProps?.components || {}) }}
      styles={mergeStyles(selectProps?.styles)}
      menuPortalTarget={selectProps?.menuPortalTarget ?? document.body}
      menuShouldScrollIntoView={false}
      {...selectProps}
    />
  );
}
