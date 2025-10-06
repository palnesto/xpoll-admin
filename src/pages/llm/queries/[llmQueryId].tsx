import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { PanelRight, Plus, X } from "lucide-react";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import { endpoints } from "@/api/endpoints";
import {
  QueryUIResponse,
  UILayoutRenderer,
} from "@/components/UILayoutRenderer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiInfiniteQuery } from "@/hooks/useApiInfiniteQuery";
import LetterGlitch from "@/components/LetterGlitch";
import TextType from "@/components/TextType";
import ExportPollsButton from "@/utils/export-poll-excel";

export function SkeletonCard() {
  return (
    <div className="flex flex-col space-y-3">
      <Skeleton className="h-[125px] w-[250px] rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  );
}

const SpecificLLMQueryPage = () => {
  const [queryResultState, setQueryResultState] = useState<any>(null);
  const [steps, setSteps] = useState<string[]>([]);
  const { llmQueryId = "" } = useParams<{ llmQueryId: string }>();

  const url = endpoints.entities.llm.pollQueryResult(llmQueryId);

  const shouldPollFurther = (data: any) => {
    const filteredData = data?.data?.data;
    if (!filteredData) return true;
    setQueryResultState(filteredData);
    const isEnded = ["complete", "failed"].includes(filteredData?.status);
    return !isEnded;
  };

  const { isLoading } = useApiQuery(url, {
    enabled: !!llmQueryId,
    refetchInterval: (query) => {
      if (query.state.data && !shouldPollFurther(query.state.data)) {
        return false;
      }
      return 3000;
    },
    refetchOnWindowFocus: false,
  });

  const { ui, status, llmResponse, queryText, llmSteps, error, excelData } =
    useMemo(() => {
      return {
        queryText: queryResultState?.input?.prompt,
        ui: queryResultState?.structuredResult?.uiConfig,
        status: queryResultState?.status,
        llmResponse: queryResultState?.llmResponse,
        llmSteps: queryResultState?.steps,
        error: queryResultState?.error,
        excelData: queryResultState?.structuredResult?.uiConfig?.excelData,
      };
    }, [queryResultState]);

  const { excelPolls, excelTotalPolls, excelTotalVotes } = useMemo(() => {
    const excelPolls = excelData?.polls;
    const excelTotalPolls = excelData?.totalPolls;
    const excelTotalVotes = excelData?.totalVotes;
    return {
      excelPolls,
      excelTotalPolls,
      excelTotalVotes,
    };
  }, [excelData]);

  return (
    <div>
      <LLMSideSheet llmQueryId={llmQueryId} />
      {excelData && status === "complete" && (
        <div className="flex justify-end w-full mb-5">
          <ExportPollsButton
            polls={excelPolls}
            totalPolls={excelTotalPolls}
            totalVotes={excelTotalVotes}
          />
        </div>
      )}
      <DisplayContent
        queryText={queryText}
        llmQueryId={llmQueryId}
        ui={ui}
        isLoading={isLoading}
        status={status}
        llmResponse={llmResponse}
        steps={llmSteps && llmSteps.length > 0 ? llmSteps : steps}
        error={error}
      />
    </div>
  );
};

type LLMQuery = {
  _id: string;
  input?: {
    prompt?: string;
  };
};

const PAGE_SIZE = 20;

export const LLMSideSheet = ({ llmQueryId }: { llmQueryId?: string }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useApiInfiniteQuery<LLMQuery>("/internal/llm/list", {}, PAGE_SIZE);

  const queries =
    data?.pages?.flatMap((p) => p?.entries)?.filter((i) => !!i) ?? [];

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (!hasNextPage || isFetchingNextPage) return;
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        fetchNextPage();
      }
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div className="w-full flex justify-end">
        <SheetTrigger asChild>
          <Button className="z-50" variant="ghost" size="icon">
            <PanelRight />
          </Button>
        </SheetTrigger>
      </div>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Last Queries</SheetTitle>
          <SheetDescription>
            <div
              id="scroll-container"
              ref={containerRef}
              className="flex flex-col gap-2 w-full max-h-[calc(100dvh-5rem)] overflow-y-auto"
            >
              <Button
                key="new-query"
                variant={!llmQueryId ? "default" : "secondary"}
                className="rounded-lg px-3 py-5 w-full"
                onClick={() => {
                  if (pathname !== `/llm/queries`) {
                    navigate(`/llm/queries`);
                  }
                  setOpen(false);
                }}
              >
                <span className="w-full text-start overflow-hidden flex gap-2 items-center">
                  <Plus /> New Query
                </span>
              </Button>
              {queries?.map((q) => (
                <Button
                  key={q?._id}
                  variant={llmQueryId === q?._id ? "default" : "ghost"}
                  className="rounded-lg px-3 py-5 w-full"
                  onClick={() => {
                    if (llmQueryId !== q?._id) {
                      navigate(`/llm/queries/${q?._id}`);
                    }
                    setOpen(false);
                  }}
                >
                  <span className="w-full text-start truncate">
                    {q?.input?.prompt ?? "Untitled Query"}
                  </span>
                </Button>
              ))}
              {isFetchingNextPage && (
                <div className="py-3 text-center text-sm text-gray-500">
                  Loading more...
                </div>
              )}
            </div>
          </SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
};

const DisplayContent = ({
  llmQueryId,
  ui,
  isLoading,
  status,
  llmResponse,
  queryText,
  steps = [],
  error,
}: {
  llmQueryId?: string;
  ui?: QueryUIResponse;
  isLoading: boolean;
  status?: string;
  llmResponse?: string;
  queryText?: string;
  steps?: string[];
  error?: {
    name?: string;
    message?: string;
    code?: string;
    _id?: string;
  };
}) => {
  if (isLoading) {
    return <div>Processing query...</div>;
  }

  if (!llmQueryId || !status) {
    return <div>No data</div>;
  }

  if (!["complete", "failed"].includes(status)) {
    return (
      <div className="h-[95dvh] flex flex-col justify-start w-full items-center">
        <div
          style={{ filter: "grayscale(100%)" }}
          className="absolute inset-0 opacity-10"
        >
          <LetterGlitch
            glitchSpeed={100}
            centerVignette={true}
            outerVignette={false}
            smooth={true}
          />
        </div>
        <div className="max-w-4xl z-50 flex flex-col items-center gap-3 w-full">
          <div className="flex flex-col gap-4 items-center col-span-2">
            <p className="text-3xl tracking-wide">Your Query</p>
            <p className="bg-[#18181a] py-5 px-10 rounded-xl text-center w-full">
              <p className="opacity-20 font-thin tracking-wide ">
                <TextType
                  text={[queryText]}
                  typingSpeed={10}
                  pauseDuration={1500}
                  showCursor={true}
                  cursorCharacter="|"
                />
              </p>
            </p>
          </div>
          <div className="ml-5">
            <MultiStepLoader
              steps={steps}
              loading={!["complete", "failed"].includes(status)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {status === "complete" && ui ? (
        <UILayoutRenderer data={ui} />
      ) : llmResponse ? (
        <p>{llmResponse}</p>
      ) : status === "failed" ? (
        <p className="text-red-700 bg-red-200 rounded-xl py-3 px-5">
          {error?.message}
        </p>
      ) : (
        <>Response failed to generate</>
      )}
    </>
  );
};

export default SpecificLLMQueryPage;
