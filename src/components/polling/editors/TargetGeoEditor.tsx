// import CitySelect from "@/components/commons/selects/city-select";
// import CountrySelect from "@/components/commons/selects/country-select";
// import StateSelect from "@/components/commons/selects/state-select";
// import { X } from "lucide-react";
// import type { Control, UseFormSetValue, UseFormWatch } from "react-hook-form";

// type Props = {
//   control: Control<any>;
//   watch: UseFormWatch<any>;
//   setValue: UseFormSetValue<any>;
//   basePath: string; // e.g. "targetGeo" or "trial.targetGeo"
//   label?: string;
// };

// export default function TargetGeoEditor({
//   watch,
//   setValue,
//   basePath,
//   label = "Target Geo",
// }: Props) {
//   const countriesPath = `${basePath}.countries`;
//   const statesPath = `${basePath}.states`;
//   const citiesPath = `${basePath}.cities`;

//   const countries = watch(countriesPath) || [];
//   const states = watch(statesPath) || [];
//   const cities = watch(citiesPath) || [];

//   function add(path: string, value: string) {
//     const arr = watch(path) || [];
//     if (!arr.includes(value)) {
//       setValue(path as any, [...arr, value], {
//         shouldValidate: true,
//         shouldDirty: true,
//       });
//     }
//   }

//   function removeAt(path: string, index: number) {
//     const arr = (watch(path) || []).slice();
//     arr.splice(index, 1);
//     setValue(path as any, arr, { shouldValidate: true, shouldDirty: true });
//   }

//   return (
//     <div className="space-y-2">
//       <label className="text-sm font-medium">{label}</label>

//       <CountrySelect
//         placeholder="Select country"
//         onChange={(opt: any) => opt?.value && add(countriesPath, opt.value)}
//       />
//       <div className="flex flex-wrap gap-2 mt-2">
//         {countries.map((c: string, i: number) => (
//           <span
//             key={`country-${i}`}
//             className="flex items-center gap-1 px-2 py-1 border rounded text-sm"
//           >
//             {c}
//             <X
//               className="w-4 h-4 cursor-pointer"
//               onClick={() => removeAt(countriesPath, i)}
//             />
//           </span>
//         ))}
//       </div>

//       <StateSelect
//         placeholder="Select state"
//         onChange={(opt: any) => opt?.value && add(statesPath, opt.value)}
//       />
//       <div className="flex flex-wrap gap-2 mt-2">
//         {states.map((s: string, i: number) => (
//           <span
//             key={`state-${i}`}
//             className="flex items-center gap-1 px-2 py-1 border rounded text-sm"
//           >
//             {s}
//             <X
//               className="w-4 h-4 cursor-pointer"
//               onClick={() => removeAt(statesPath, i)}
//             />
//           </span>
//         ))}
//       </div>

//       <CitySelect
//         placeholder="Select city"
//         onChange={(opt: any) => opt?.value && add(citiesPath, opt.value)}
//       />
//       <div className="flex flex-wrap gap-2 mt-2">
//         {cities.map((city: string, i: number) => (
//           <span
//             key={`city-${i}`}
//             className="flex items-center gap-1 px-2 py-1 border rounded text-sm"
//           >
//             {city}
//             <X
//               className="w-4 h-4 cursor-pointer"
//               onClick={() => removeAt(citiesPath, i)}
//             />
//           </span>
//         ))}
//       </div>
//     </div>
//   );
// }
// TargetGeoEditor.tsx
import CitySelect from "@/components/commons/selects/city-select";
import CountrySelect from "@/components/commons/selects/country-select";
import StateSelect from "@/components/commons/selects/state-select";
import { GeoItem } from "@/components/types/trial";
import { X } from "lucide-react";
import type { Control, UseFormSetValue, UseFormWatch } from "react-hook-form";

type Props = {
  control: Control<any>;
  watch: UseFormWatch<any>; // keep if you still want it for debugging
  setValue: UseFormSetValue<any>;
  basePath: string; // e.g. "targetGeo"
  label?: string;
};

function toGeoItem(opt: any): GeoItem | null {
  if (!opt) return null;
  // 🔎 Pull from opt.data first (that’s what your console showed)
  const fromData = opt.data || {};
  const id =
    fromData._id ??
    opt._id ??
    opt.value ?? // react-select style
    fromData.value ??
    opt.code ??
    opt.id ??
    null;

  if (!id) {
    console.log("[TG:toGeoItem] could not resolve id from:", opt);
    return null;
  }

  const name =
    fromData.name ??
    opt.name ??
    opt.label ?? // react-select style
    fromData.label ??
    opt.text ??
    String(id);

  const item = { _id: String(id), name: String(name) };
  console.log("[TG:toGeoItem] mapped", { raw: opt, item });
  return item;
}

export default function TargetGeoEditor({
  control,
  watch, // not required for subscription any more, but fine to keep
  setValue,
  basePath,
  label = "Target Geo",
}: Props) {
  const countriesPath = `${basePath}.countries`;
  const statesPath = `${basePath}.states`;
  const citiesPath = `${basePath}.cities`;

  const countries: GeoItem[] = watch(`${basePath}.countries`) || [];
  const states: GeoItem[] = watch(`${basePath}.states`) || [];
  const cities: GeoItem[] = watch(`${basePath}.cities`) || [];

  function addMany(path: string, opts: any) {
    const list = Array.isArray(opts) ? opts : [opts];
    const items = list.map(toGeoItem).filter(Boolean) as GeoItem[];
    const current: GeoItem[] =
      path === countriesPath
        ? countries
        : path === statesPath
        ? states
        : cities;

    const next = [...current];
    for (const it of items) {
      if (!next.some((x) => x._id === it._id)) next.push(it);
    }
    console.log("[TG:addMany]", {
      path,
      from: opts,
      before: current,
      after: next,
    });
    setValue(path as any, next, { shouldValidate: true, shouldDirty: true });
  }

  function removeAt(path: string, index: number) {
    const current: GeoItem[] =
      (path === countriesPath
        ? countries
        : path === statesPath
        ? states
        : cities) || [];
    const next = current.slice();
    next.splice(index, 1);
    console.log("[TG:removeAt]", { path, index, before: current, after: next });
    setValue(path as any, next, { shouldValidate: true, shouldDirty: true });
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>

      <CountrySelect
        placeholder="Select country"
        onChange={(opt: any) => {
          console.log("[TG:country:onChange:raw]", opt);
          addMany(countriesPath, opt);
        }}
      />
      <div className="flex flex-wrap gap-2 mt-2">
        {countries.map((c, i) => (
          <span
            key={`country-${c._id}-${i}`}
            className="flex items-center gap-1 px-2 py-1 border rounded text-sm"
          >
            {c.name}
            <X
              className="w-4 h-4 cursor-pointer"
              onClick={() => removeAt(countriesPath, i)}
            />
          </span>
        ))}
      </div>

      <StateSelect
        placeholder="Select state"
        onChange={(opt: any) => {
          console.log("[TG:state:onChange:raw]", opt);
          addMany(statesPath, opt);
        }}
      />
      <div className="flex flex-wrap gap-2 mt-2">
        {states.map((s, i) => (
          <span
            key={`state-${s._id}-${i}`}
            className="flex items-center gap-1 px-2 py-1 border rounded text-sm"
          >
            {s.name}
            <X
              className="w-4 h-4 cursor-pointer"
              onClick={() => removeAt(statesPath, i)}
            />
          </span>
        ))}
      </div>

      <CitySelect
        placeholder="Select city"
        onChange={(opt: any) => {
          console.log("[TG:city:onChange:raw]", opt);
          addMany(citiesPath, opt);
        }}
      />
      <div className="flex flex-wrap gap-2 mt-2">
        {cities.map((city, i) => (
          <span
            key={`city-${city._id}-${i}`}
            className="flex items-center gap-1 px-2 py-1 border rounded text-sm"
          >
            {city.name}
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
