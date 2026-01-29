import { endpoints } from "@/api/endpoints";
import { BlogSelect } from "@/components/commons/selects/blog-select";
import { CampaignSelect } from "@/components/commons/selects/campaign-select";
import { PollSelect } from "@/components/commons/selects/poll-select";
import { TrialSelect } from "@/components/commons/selects/trial-select";
import { useApiQuery } from "@/hooks/useApiQuery";
// import { useNavigate } from "react-router";
const TestPage = () => {
  // const navigate = useNavigate();
  // const env = import.meta.env.VITE_MODE;
  // if (env !== "local") {
  //   navigate(`/`);
  // }
  const { data } = useApiQuery(endpoints.grwb.healthCheck);
  console.log("data", data);

  return (
    <div>
      <TrialSelect onChange={(opt) => console.log("trialId", opt?.value)} />

      <PollSelect
        onChange={(opt) => console.log("pollId", opt?.value)}
        selectProps={{ menuPortalTarget: document.body }}
      />

      <CampaignSelect
        onChange={(opt) => console.log("campaignId", opt?.value)}
      />

      <BlogSelect onChange={(opt) => console.log("blogId", opt?.value)} />
    </div>
  );
};

export default TestPage;
