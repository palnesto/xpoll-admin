import { endpoints } from "@/api/endpoints";
import {
  QueryUIResponse,
  UILayoutRenderer,
} from "@/components/UILayoutRenderer";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useMemo, useState } from "react";
import { useParams } from "react-router";

const SpecificLLMQueryPage = () => {
  const [queryResultState, setQueryResultState] = useState(null);

  const { llmQueryId = "" } = useParams<{ llmQueryId: string }>();
  console.log("SpecificLLMQueryPage: llmQueryId", llmQueryId);
  const url = endpoints.entities.llm.pollQueryResult(llmQueryId);
  console.log("SpecificLLMQueryPage: url", url);
  const query = useApiQuery(url, {
    enabled: !!llmQueryId,
    refetchInterval: (query) => {
      // If data exists and condition fails, stop polling (return false)
      if (query.state.data && !shouldPollFurther(query.state.data)) {
        return false;
      }
      // Otherwise, poll every 5 seconds
      return 5000;
    },
    refetchOnWindowFocus: false, // avoid refetching when tab is focused
  });

  const shouldPollFurther = (data: any) => {
    console.log("entering?");
    const filteredData = data?.data?.data;
    if (!filteredData) return true;
    setQueryResultState(filteredData);
    const isEnded = ["complete", "failed"].includes(filteredData?.status);
    return !isEnded;
  };

  //   const query2 = useQuery({
  //     queryKey: ["status"],
  //     queryFn: fetchData,
  //     refetchInterval: (query) => {
  //       // If data exists and condition fails, stop polling (return false)
  //       if (query.state.data && !shouldPollFurther(query.state.data)) {
  //         return false;
  //       }
  //       // Otherwise, poll every 5 seconds
  //       return 5000;
  //     },
  //     refetchOnWindowFocus: false, // avoid refetching when tab is focused
  //   });

  //   const ui = filteredData?.structuredResult?.ui;

  const { ui, status } = useMemo(() => {
    const ui = queryResultState?.structuredResult?.ui;
    const status = queryResultState?.status;
    return { ui, status };
  }, [queryResultState]);

  return (
    <div>
      <p>{`status: ${status}`}</p>
      {/* <pre>{JSON.stringify(ui, null, 2)}</pre> */}
      <UILayoutRenderer data={ui as QueryUIResponse} />
    </div>
  );
};

export default SpecificLLMQueryPage;
