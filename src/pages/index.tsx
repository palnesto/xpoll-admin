import LocationSelect from "@/components/commons/selects/location-select";

const IndexPage = () => {
  return (
    <div className="text-black">
      <div style={{ maxWidth: 420 }}>
        <h3>Select a city</h3>
        <LocationSelect
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
    </div>
  );
};

export default IndexPage;
