import { UILayoutRenderer } from "@/components/UILayoutRenderer";
import jsonData from "@/result.json";
import ExportPollsButton from "@/utils/export-poll-excel";
import { useNavigate } from "react-router";
const TestPage = () => {
  const navigate = useNavigate();
  const env = import.meta.env.VITE_MODE;
  if (env !== "local") {
    navigate(`/`);
  }
  const polls = [
    {
      title: "AI in legal gov..",
      description: "()",
      opt1Meaning: "india will win",
      opt1: "Yes (32)",
      opt2Meaning: "",
      opt2: "No (20)",
      opt3Meaning: "",
      opt3: "Maybe (3)",
      opt4Meaning: "",
      opt4: "No opinion (1)",
    },
    {
      title: "AI in legal gov..",
      description: "()",
      opt1Meaning: "india will win",
      opt1: "Ya",
      opt2Meaning: "",
      opt2: "",
      opt3Meaning: "",
      opt3: "",
      opt4Meaning: "",
      opt4: "",
    },
  ];
  return (
    <div>
      <ExportPollsButton polls={polls} totalPolls={13} totalVotes={300} />;
      <UILayoutRenderer data={jsonData} />
    </div>
  );
};

export default TestPage;
