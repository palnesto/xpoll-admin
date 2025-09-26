import React from "react";
import Select from "react-select";

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
  selectProps?: Partial<React.ComponentProps<typeof Select<AssetOption, true>>>;
};

export default function AssetMultiSelect({
  value,
  onChange,
  placeholder = "Select assets…",
  selectProps,
}: Props) {
  return (
    <Select<AssetOption, true>
      isMulti
      options={ASSET_OPTIONS}
      value={value}
      placeholder={placeholder}
      onChange={(v) => onChange?.(v as AssetOption[])}
      // react-select matching is case-insensitive by default
      menuPortalTarget={selectProps?.menuPortalTarget}
      menuShouldScrollIntoView={false}
      {...selectProps}
    />
  );
}
