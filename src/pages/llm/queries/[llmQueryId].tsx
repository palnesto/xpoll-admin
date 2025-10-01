import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { PanelRight, Plus } from "lucide-react";

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

// -------------------- Skeleton Loader --------------------
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

// -------------------- Main Page --------------------
const SpecificLLMQueryPage = () => {
  const [queryResultState, setQueryResultState] = useState<any>(null);
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
      return 5000; // poll every 5s until done
    },
    refetchOnWindowFocus: false,
  });

  const { ui, status, llmResponse, queryText } = useMemo(() => {
    return {
      queryText: queryResultState?.input?.prompt,
      ui: queryResultState?.structuredResult?.ui,
      status: queryResultState?.status,
      llmResponse: queryResultState?.llmResponse,
    };
  }, [queryResultState]);

  return (
    <div>
      <LLMSideSheet llmQueryId={llmQueryId} />
      <DisplayContent
        queryText={queryText}
        llmQueryId={llmQueryId}
        ui={ui}
        isLoading={isLoading}
        status={status}
        llmResponse={llmResponse}
      />
    </div>
  );
};

// -------------------- Types --------------------
type LLMQuery = {
  _id: string;
  input?: {
    prompt?: string;
  };
};

const PAGE_SIZE = 20;

// -------------------- Side Sheet --------------------
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
          <Button variant="ghost" size="icon">
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
              {/* New Query Button */}
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

              {console.log("queries", queries)}
              {/* Query List */}
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

// -------------------- Content Display --------------------
const DisplayContent = ({
  llmQueryId,
  ui,
  isLoading,
  status,
  llmResponse,
  queryText,
}: {
  llmQueryId?: string;
  ui?: QueryUIResponse;
  isLoading: boolean;
  status?: string;
  llmResponse?: string;
  queryText?: string;
}) => {
  if (isLoading) {
    return <div>Loading...</div>;
  }

  console.log({
    llmQueryId,
    ui,
    status,
  });
  if (!llmQueryId || !status) {
    return <div>No data</div>;
  }

  if (!["complete", "failed"].includes(status)) {
    return (
      <div>
        <h1>Query: {queryText}</h1>
        <h2>Status: {status}</h2>
        <SkeletonCard />
      </div>
    );
  }

  return (
    <>
      <p>{`status: ${status}`}</p>
      {status === "complete" && ui ? (
        <UILayoutRenderer data={ui} />
      ) : llmResponse ? (
        <p>{llmResponse}</p>
      ) : (
        <>Response failed to generate</>
      )}
    </>
  );
};

export default SpecificLLMQueryPage;
