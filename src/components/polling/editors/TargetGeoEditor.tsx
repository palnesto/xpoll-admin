import { useEffect, useState } from "react";
import CitySelect from "@/components/commons/selects/city-select";
import CountrySelect from "@/components/commons/selects/country-select";
import StateSelect from "@/components/commons/selects/state-select";
import type { Control, UseFormSetValue, UseFormWatch } from "react-hook-form";

// react-select option shape used by your base selects
type BaseOption<T = unknown> = {
  value: string;
  label: string;
  data?: T;
};

type Props = {
  control: Control<any>; // kept for parity, not used directly here
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  basePath: string; // e.g. "targetGeo"
  label?: string;
  selectProps?: Record<string, any>;
};

// -------------------- NEW: normalize form values -> select options --------------------
function asOptions<T extends { _id?: string; name?: string }>(
  list: Array<string | T> | undefined | null
): BaseOption<T>[] {
  const arr = Array.isArray(list) ? list : [];
  return arr.map((item) => {
    if (typeof item === "string") {
      return { value: item, label: item } as BaseOption<T>;
    }
    const id = String(item?._id ?? "");
    const name = String(item?.name ?? id);
    return { value: id, label: name, data: item } as BaseOption<T>;
  });
}

export default function TargetGeoEditor({
  control, // eslint-disable-line @typescript-eslint/no-unused-vars
  watch,
  setValue,
  basePath,
  label = "Target Geo",
  selectProps,
}: Props) {
  const countriesPath = `${basePath}.countries`;
  const statesPath = `${basePath}.states`;
  const citiesPath = `${basePath}.cities`;

  // --- Watch the form fields (can be string[] or {_id,name}[]) ---
  const countriesRaw = watch(countriesPath) || [];
  const statesRaw = watch(statesPath) || [];
  const citiesRaw = watch(citiesPath) || [];

  // --- Local UI state for react-select controlled value (so tags show inside the select) ---
  const [selCountries, setSelCountries] = useState<BaseOption[]>([]);
  const [selStates, setSelStates] = useState<BaseOption[]>([]);
  const [selCities, setSelCities] = useState<BaseOption[]>([]);

  // -------------------- NEW: hydrate controlled values on edit --------------------

  useEffect(() => {
    setSelCountries(asOptions(countriesRaw));
  }, [countriesRaw]);

  useEffect(() => {
    setSelStates(asOptions(statesRaw));
  }, [statesRaw]);

  useEffect(() => {
    setSelCities(asOptions(citiesRaw));
  }, [citiesRaw]);

  // When user changes countries in the select
  const onCountriesChange = (opts: BaseOption[]) => {
    setSelCountries(opts);
    setValue(
      countriesPath as any,
      opts.map((o) => ({ _id: o.value, name: o.label })), // <-- keep label
      { shouldValidate: true, shouldDirty: true }
    );
  };

  // States
  const onStatesChange = (opts: BaseOption[]) => {
    setSelStates(opts);
    setValue(
      statesPath as any,
      opts.map((o) => ({ _id: o.value, name: o.label })), // <-- keep label
      { shouldValidate: true, shouldDirty: true }
    );
  };

  // Cities
  const onCitiesChange = (opts: BaseOption[]) => {
    setSelCities(opts);
    setValue(
      citiesPath as any,
      opts.map((o) => ({ _id: o.value, name: o.label })), // <-- keep label
      { shouldValidate: true, shouldDirty: true }
    );
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">{label}</label>

      {/* Countries (prefilled via selCountries) */}
      <CountrySelect
        placeholder="Select countries"
        value={selCountries}
        onChange={(opts: BaseOption[]) => onCountriesChange(opts)}
        selectProps={{
          ...selectProps,
          closeMenuOnSelect: false,
          isClearable: true,
        }}
      />

      {/* States */}
      <StateSelect
        placeholder="Select states"
        value={selStates}
        onChange={(opts: BaseOption[]) => onStatesChange(opts)}
        selectProps={{
          ...selectProps,
          closeMenuOnSelect: false,
          isClearable: true,
        }}
      />

      {/* Cities */}
      <CitySelect
        placeholder="Select cities"
        value={selCities}
        onChange={(opts: BaseOption[]) => onCitiesChange(opts)}
        selectProps={{
          ...selectProps,
          closeMenuOnSelect: false,
          isClearable: true,
        }}
      />
    </div>
  );
}
