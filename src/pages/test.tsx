import { UILayoutRenderer } from "@/components/UILayoutRenderer";
import jsonData from "@/result.json";
import { useNavigate } from "react-router";
const TestPage = () => {
  const navigate = useNavigate();
  const env = import.meta.env.VITE_MODE;
  if (env !== "local") {
    navigate(`/`);
  }
  return (
    <div>
      <UILayoutRenderer data={jsonData} />
    </div>
  );
};

export default TestPage;
