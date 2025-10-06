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
      _id: "68cd82096a389a59d0b8bb4d",
      title: "Topic of Interest",
      description: "Which KBW topic excites you most?",
      options: [
        {
          meaning: "Interest Topics",
          label: "Regulation (583)",
        },
        {
          meaning: "Interest Topics",
          label: "NFTs & gaming (441)",
        },
        {
          meaning: "Interest Topics",
          label: "RWAfi (149)",
        },
        {
          meaning: "Interest Topics",
          label: "DeFi (51)",
        },
      ],
    },
    {
      _id: "68cd82086a389a59d0b8bb46",
      title: "KBW Goals",
      description: "What is your main goal for KBW?",
      options: [
        {
          meaning: "Goals",
          label: "Investing (583)",
        },
        {
          meaning: "Goals",
          label: "Networking (452)",
        },
        {
          meaning: "Goals",
          label: "Other (128)",
        },
        {
          meaning: "Goals",
          label: "Learning (61)",
        },
      ],
    },
    {
      _id: "68cd82096a389a59d0b8bb5b",
      title: "Token2049 Plans",
      description: "Will you attend Token2049 right after KBW?",
      options: [
        {
          meaning: "Token2049 Attendance",
          label: "No (624)",
        },
        {
          meaning: "Token2049 Attendance",
          label: "Undecided (409)",
        },
        {
          meaning: "Token2049 Attendance",
          label: "Yes (191)",
        },
      ],
    },
    {
      _id: "68d04e89c71533633b7026c8",
      title: "Best contacts to make at KBW?",
      description:
        "Do you think it would be better to talk to protocols, evangelists, or investors at KWB",
      options: [
        {
          meaning: "Networking Contacts",
          label: "Protocols (649)",
        },
        {
          meaning: "Networking Contacts",
          label: "Investors (367)",
        },
        {
          meaning: "Networking Contacts",
          label: "Evangelists (196)",
        },
        {
          meaning: "Networking Contacts",
          label: "Community Attendees (50)",
        },
        {
          meaning: "Networking Contacts",
          label: "undefined (12)",
        },
      ],
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
