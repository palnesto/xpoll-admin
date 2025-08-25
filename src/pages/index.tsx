import InfiniteSelect from "@/components/commons/selects/base/infinite-select";
import { CitySelect } from "@/components/commons/selects/city-select";
import CountrySelect from "@/components/commons/selects/country-select";
import { SlugCreatableSelect } from "@/components/commons/selects/slug-creatable-select";
import StateSelect from "@/components/commons/selects/state-select";
import { useState } from "react";

const IndexPage = () => {
  return (
    <div className="text-black">
      <div style={{ maxWidth: 420 }}>
        <h3>Select a city</h3>
        <CitySelect
          placeholder="Type to search cities…"
          onChange={(opt) => {
            // You already get a console.log from the component;
            // here’s where you can react to the selection:
            if (opt?.data) {
              // do something with opt.data (city/state/country)
              // e.g. save to form state, fire API, etc.
            }
          }}
        />
      </div>
      <div style={{ maxWidth: 420 }}>
        <h3>Select a city</h3>
        <StateSelect
          placeholder="Type to search states"
          onChange={(opt) => {
            // You already get a console.log from the component;
            // here’s where you can react to the selection:
            if (opt?.data) {
              // do something with opt.data (city/state/country)
              // e.g. save to form state, fire API, etc.
            }
          }}
        />
      </div>
      <div style={{ maxWidth: 420 }}>
        <h3>Select a city</h3>
        <CountrySelect
          placeholder="Type to search countries"
          onChange={(opt) => {
            // You already get a console.log from the component;
            // here’s where you can react to the selection:
            if (opt?.data) {
              // do something with opt.data (city/state/country)
              // e.g. save to form state, fire API, etc.
            }
          }}
        />
      </div>

      <div>
        <InfiniteSelect<{ _id: string; name: string }>
          route="/internal/preference/slugs"
          getFilters={(search) => ({ q: search })}
          mapItemToOption={(item) => ({
            value: item._id,
            label: item.name,
            data: item,
          })}
        />
      </div>

      <ExampleSlugForm />
    </div>
  );
};

export default IndexPage;

type SlugItem = { _id: string; name: string };
type Option = { value: string; label: string; data?: SlugItem };

function ExampleSlugForm() {
  const [selected, setSelected] = useState<Option | null>(null);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Select or Create Slug</h2>

      <SlugCreatableSelect
        value={selected}
        onChange={(opt) => {
          console.log("Selected option:", opt);
          setSelected(opt);
        }}
        placeholder="Search or create slug..."
      />

      {selected && (
        <div className="mt-4 p-3 border border-white/10 rounded-md bg-white/5">
          <p className="text-sm text-white/70">Currently selected slug:</p>
          <p className="text-white font-semibold">{selected.label}</p>
        </div>
      )}
    </div>
  );
}
