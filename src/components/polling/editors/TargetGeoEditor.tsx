import CountrySelect from "@/components/commons/selects/country-select";
import StateSelect from "@/components/commons/selects/state-select";
import { CitySelect } from "@/components/commons/selects/city-select";
import { X } from "lucide-react";
import type { Control, UseFormSetValue, UseFormWatch } from "react-hook-form";

type Props = {
  control: Control<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  basePath: string; // e.g. "targetGeo" or "trial.targetGeo"
  label?: string;
};

export default function TargetGeoEditor({
  watch,
  setValue,
  basePath,
  label = "Target Geo",
}: Props) {
  const countriesPath = `${basePath}.countries`;
  const statesPath = `${basePath}.states`;
  const citiesPath = `${basePath}.cities`;

  const countries = watch(countriesPath) || [];
  const states = watch(statesPath) || [];
  const cities = watch(citiesPath) || [];

  function add(path: string, value: string) {
    const arr = watch(path) || [];
    if (!arr.includes(value)) {
      setValue(path as any, [...arr, value], {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }

  function removeAt(path: string, index: number) {
    const arr = (watch(path) || []).slice();
    arr.splice(index, 1);
    setValue(path as any, arr, { shouldValidate: true, shouldDirty: true });
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>

      <CountrySelect
        placeholder="Select country"
        onChange={(opt: any) => opt?.value && add(countriesPath, opt.value)}
      />
      <div className="flex flex-wrap gap-2 mt-2">
        {countries.map((c: string, i: number) => (
          <span
            key={`country-${i}`}
            className="flex items-center gap-1 px-2 py-1 border rounded text-sm"
          >
            {c}
            <X
              className="w-4 h-4 cursor-pointer"
              onClick={() => removeAt(countriesPath, i)}
            />
          </span>
        ))}
      </div>

      <StateSelect
        placeholder="Select state"
        onChange={(opt: any) => opt?.value && add(statesPath, opt.value)}
      />
      <div className="flex flex-wrap gap-2 mt-2">
        {states.map((s: string, i: number) => (
          <span
            key={`state-${i}`}
            className="flex items-center gap-1 px-2 py-1 border rounded text-sm"
          >
            {s}
            <X
              className="w-4 h-4 cursor-pointer"
              onClick={() => removeAt(statesPath, i)}
            />
          </span>
        ))}
      </div>

      <CitySelect
        placeholder="Select city"
        onChange={(opt: any) => opt?.value && add(citiesPath, opt.value)}
      />
      <div className="flex flex-wrap gap-2 mt-2">
        {cities.map((city: string, i: number) => (
          <span
            key={`city-${i}`}
            className="flex items-center gap-1 px-2 py-1 border rounded text-sm"
          >
            {city}
            <X
              className="w-4 h-4 cursor-pointer"
              onClick={() => removeAt(citiesPath, i)}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
