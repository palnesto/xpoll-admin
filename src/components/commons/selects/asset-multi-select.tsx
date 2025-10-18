// import React from "react";
// import Select from "react-select";

// export type AssetOption = { value: string; label: string };

// // Add/remove assets here if needed.
// const ASSET_OPTIONS: AssetOption[] = [
//   { value: "xDrop", label: "xDrop" },
//   { value: "xOcta", label: "xOcta" },
//   { value: "xPoll", label: "xPoll" },
//   { value: "xMYST", label: "xMYST" },
// ];

// type Props = {
//   value?: AssetOption[];
//   onChange?: (options: AssetOption[]) => void;
//   placeholder?: string;
//   selectProps?: Partial<React.ComponentProps<typeof Select<AssetOption, true>>>;
// };

// export default function AssetMultiSelect({
//   value,
//   onChange,
//   placeholder = "Select assets…",
//   selectProps,
// }: Props) {
//   return (
//     <Select<AssetOption, true>
//       isMulti
//       options={ASSET_OPTIONS}
//       value={value}
//       placeholder={placeholder}
//       onChange={(v) => onChange?.(v as AssetOption[])}
//       // react-select matching is case-insensitive by default
//       menuPortalTarget={selectProps?.menuPortalTarget}
//       menuShouldScrollIntoView={false}
//       {...selectProps}
//     />
//   );
// }
import React from "react";
import Select, { GroupBase } from "react-select";

export type AssetOption = { value: string; label: string };

// Add/remove assets here if needed.
const ASSET_OPTIONS: AssetOption[] = [
  { value: "xDrop", label: "xDrop" },
  { value: "xOcta", label: "xOcta" },
  { value: "xPoll", label: "xPoll" },
  { value: "xMYST", label: "xMYST" },
];

type Props = {
  value?: AssetOption[];
  onChange?: (options: AssetOption[]) => void;
  placeholder?: string;
  selectProps?: Partial<
    React.ComponentProps<
      typeof Select<AssetOption, true, GroupBase<AssetOption>>
    >
  >;
};

export default function AssetMultiSelect({
  value,
  onChange,
  placeholder = "Select assets…",
  selectProps,
}: Props) {
  // Dark-friendly styles merged with any caller overrides
  const mergeStyles = (
    base: NonNullable<typeof selectProps>["styles"]
  ): NonNullable<typeof selectProps>["styles"] => {
    // shadcn tokens with fallbacks
    const fg = "hsl(var(--foreground, 0 0% 100%))";
    const border = "hsl(var(--border, 240 5% 26%))";
    const muted = "hsl(var(--muted, 240 4.8% 15%))";
    const mutedFg = "hsl(var(--muted-foreground, 240 5% 64%))";

    const ours = {
      menuPortal: (p: any) => ({ ...p, zIndex: 9999 }),
      control: (p: any) => ({
        ...p,
        minHeight: 38,
        boxShadow: "none",
        background: "transparent",
        borderColor: border,
        ":hover": { borderColor: border },
        color: fg,
      }),
      valueContainer: (p: any) => ({
        ...p,
        background: "transparent",
      }),
      input: (p: any) => ({
        ...p,
        color: fg, // search input text
      }),
      placeholder: (p: any) => ({
        ...p,
        color: mutedFg,
      }),
      singleValue: (p: any) => ({
        ...p,
        color: fg,
      }),
      multiValue: (p: any) => ({
        ...p,
        borderRadius: 9999,
        background: muted,
      }),
      multiValueLabel: (p: any) => ({
        ...p,
        color: fg,
      }),
      multiValueRemove: (p: any) => ({
        ...p,
        color: fg,
        ":hover": {
          background: "hsl(var(--destructive, 0 84% 60%))",
          color: "hsl(var(--destructive-foreground, 0 0% 100%))",
        },
      }),
      dropdownIndicator: (p: any) => ({
        ...p,
        color: fg,
        ":hover": { color: fg },
      }),
      clearIndicator: (p: any) => ({
        ...p,
        color: fg,
        ":hover": { color: fg },
      }),
      menu: (p: any) => ({
        ...p,
        background: "rgba(0,0,0,0.85)", // dark/transparent
        backdropFilter: "blur(4px)",
        border: `1px solid ${border}`,
      }),
      menuList: (p: any) => ({
        ...p,
        background: "transparent",
        padding: 4,
      }),
      option: (p: any, state: any) => ({
        ...p,
        background: state.isFocused ? muted : "transparent",
        color: fg,
        ":active": { background: muted },
      }),
    };

    if (!base) return ours;

    // shallow-merge each style fn while preserving caller overrides
    const keys = new Set([...Object.keys(ours), ...Object.keys(base)]);
    const merged: any = {};
    for (const k of keys) {
      const a = (ours as any)[k];
      const b = (base as any)[k];
      if (!b) {
        merged[k] = a;
      } else if (!a) {
        merged[k] = b;
      } else {
        merged[k] = (provided: any, state: any) => {
          const bOut = typeof b === "function" ? b(provided, state) : b;
          const aOut = typeof a === "function" ? a(provided, state) : a;
          return { ...bOut, ...aOut };
        };
      }
    }
    return merged;
  };

  return (
    <Select<AssetOption, true, GroupBase<AssetOption>>
      isMulti
      options={ASSET_OPTIONS}
      value={value}
      placeholder={placeholder}
      onChange={(v) => onChange?.(v as AssetOption[])}
      // visual fixes
      styles={mergeStyles(selectProps?.styles)}
      menuPortalTarget={selectProps?.menuPortalTarget ?? document.body}
      menuShouldScrollIntoView={false}
      // allow callers to still override other props
      {...selectProps}
    />
  );
}
