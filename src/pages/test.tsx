import { UILayoutRenderer } from "@/components/UILayoutRenderer";
import jsonData from "@/result.json";
const TestPage = () => {
  return (
    <div>
      <UILayoutRenderer data={jsonData} />
    </div>
  );
};

export default TestPage;
