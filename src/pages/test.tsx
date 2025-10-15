import { endpoints } from "@/api/endpoints";
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

  return <div></div>;
};

export default TestPage;
