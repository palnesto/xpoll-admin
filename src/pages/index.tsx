import { SlugCreatableSelect } from "@/components/commons/selects/slug-creatable-select";
import { useState } from "react";
import { lazy } from "react";
const Dashboard = lazy(() =>
  import("./dashboard").then((mod) => ({ default: mod.Dashboard }))
);
import { Navigate } from "react-router-dom";

const IndexPage = () => {
  return <Navigate to="/actions" />;
  return <Dashboard />;
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
