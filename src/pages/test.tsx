import data from "@/result.json";
import { UILayoutRenderer } from "@/components/UILayoutRenderer";
export type ConfidenceLevel = "Low" | "Medium" | "High";
type UIBlock = TextBlock | TableBlock | ChartBlock | StatCardBlock | NoteBlock;

interface TextBlock {
  type: "text";
  variant: "heading" | "subheading" | "body";
  content: string;
}

interface TableBlock {
  type: "table";
  title?: string;
  columns: string[];
  rows: (string | number | null)[][];
}

interface ChartBlock {
  type: "chart";
  chartType: "bar" | "pie";
  title?: string;
  data: { label: string; value: number }[];
}

interface StatCardBlock {
  type: "stat-cards";
  cards: { label: string; value: string | number; unit?: string }[];
}

interface NoteBlock {
  type: "text";
  variant: "note";
  content: string;
}

export interface QueryUIResponse {
  meta: {
    query: string;
    generatedAt: string;
    confidence: { score: number; level: ConfidenceLevel };
    coverage: { pollsConsidered: number; totalVotes: number };
    tags?: string[];
  };
  layout: UIBlock[];
}

const TestPage = () => {
  //   const [data, setData] = useState<QueryUIResponse | null>(null);

  //   useEffect(() => {
  //     async function fetchResult() {
  //       const res = await fetch(`/api/llm/query/${queryId}`);
  //       const json = await res.json();
  //       setData(json?.structuredResult?.uiLayout ?? null);
  //     }
  //     fetchResult();
  //   }, [queryId]);

  if (!data) {
    return <div className="p-4 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <UILayoutRenderer data={data as QueryUIResponse} />
    </div>
  );
};

export default TestPage;
