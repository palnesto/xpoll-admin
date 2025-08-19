import { CitySelect } from "@/components/commons/selects/city-select";
import CountrySelect from "@/components/commons/selects/country-select";
import StateSelect from "@/components/commons/selects/state-select";

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
    </div>
  );
};

export default IndexPage;
