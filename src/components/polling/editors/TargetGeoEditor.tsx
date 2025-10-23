import { useState } from "react";
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
  selectProps?: Parameters<
    typeof MultiInfiniteSelect<CityItem>
  >[0]["selectProps"];
};

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

  // --- Form values: we store IDs only ---
  const countriesIds: string[] = watch(countriesPath) || [];
  const statesIds: string[] = watch(statesPath) || [];
  const citiesIds: string[] = watch(citiesPath) || [];

  // --- Local UI state for react-select controlled value (so tags show inside the select) ---
  const [selCountries, setSelCountries] = useState<BaseOption[]>([]);
  const [selStates, setSelStates] = useState<BaseOption[]>([]);
  const [selCities, setSelCities] = useState<BaseOption[]>([]);

  // NOTE:
  // We don't have labels for preloaded IDs from the form.
  // If you want to hydrate labels on mount (edit mode), you can:
  //  - fetch by IDs and map { value: id, label: fetchedName }
  //  - or let it remain empty and it fills as users add/select again.
  // Here we keep it simple and do not auto-fetch for hydration.

  // When user changes countries in the select
  const onCountriesChange = (opts: BaseOption[]) => {
    setSelCountries(opts);
    setValue(
      countriesPath as any,
      opts.map((o) => o.value),
      { shouldValidate: true, shouldDirty: true }
    );
  };

  // When user changes states
  const onStatesChange = (opts: BaseOption[]) => {
    setSelStates(opts);
    setValue(
      statesPath as any,
      opts.map((o) => o.value),
      { shouldValidate: true, shouldDirty: true }
    );
  };

  // When user changes cities
  const onCitiesChange = (opts: BaseOption[]) => {
    setSelCities(opts);
    setValue(
      citiesPath as any,
      opts.map((o) => o.value),
      { shouldValidate: true, shouldDirty: true }
    );
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">{label}</label>

      {/* Countries (IDs stored in form; tags shown inside the select via selCountries) */}
      <CountrySelect
        placeholder="Select countries"
        value={selCountries}
        onChange={(opts: BaseOption[]) => onCountriesChange(opts)}
        selectProps={{
          // keep the select controlled by our selCountries state
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
