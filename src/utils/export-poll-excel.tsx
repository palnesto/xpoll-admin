import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import { FileDown, Table } from "lucide-react";

/**
 * Accepted shapes:
 * - Preferred props:
 *   polls: Array<{ _id, title, description, options: Array<{ meaning, label }> }>
 *   totalPolls: number
 *   totalVotes: number
 *
 * - Also tolerant if someone accidentally passes the entire excelData object
 *   as the `polls` prop:
 *   polls = { polls: [...], totalPolls: number, totalVotes: number }
 */

type PollOption = { meaning: string; label: string };
type PollRow = {
  _id: string;
  title: string;
  description: string;
  options: PollOption[];
};

type Props =
  | {
      polls: PollRow[];
      totalPolls: number;
      totalVotes: number;
    }
  | {
      // tolerate excelData-shaped object accidentally passed as `polls`
      polls: {
        polls?: PollRow[];
        totalPolls?: number;
        totalVotes?: number;
      };
      totalPolls?: number;
      totalVotes?: number;
    };

function normalizeInput(props: Props) {
  // If polls is already an array (preferred usage)
  if (Array.isArray((props as any).polls)) {
    const pollsArr = (props as any).polls as PollRow[];
    return {
      polls: pollsArr,
      totalPolls:
        typeof (props as any).totalPolls === "number"
          ? (props as any).totalPolls
          : pollsArr.length,
      totalVotes:
        typeof (props as any).totalVotes === "number"
          ? (props as any).totalVotes
          : 0,
    };
  }

  // If polls is an object (excelData) that contains polls/totalPolls/totalVotes
  const excelData = (props as any).polls || {};
  const pollsArr = Array.isArray(excelData.polls)
    ? (excelData.polls as PollRow[])
    : [];
  const totalPolls =
    typeof (props as any).totalPolls === "number"
      ? (props as any).totalPolls
      : typeof excelData.totalPolls === "number"
      ? excelData.totalPolls
      : pollsArr.length;
  const totalVotes =
    typeof (props as any).totalVotes === "number"
      ? (props as any).totalVotes
      : typeof excelData.totalVotes === "number"
      ? excelData.totalVotes
      : 0;

  return { polls: pollsArr, totalPolls, totalVotes };
}

const ExportPollsButton = (props: Props) => {
  const handleExport = () => {
    const { polls, totalPolls, totalVotes } = normalizeInput(props);
    const safePolls: PollRow[] = Array.isArray(polls) ? polls : [];

    // Dynamic columns based on max options
    const maxOptions = safePolls.reduce(
      (m, p) => Math.max(m, Array.isArray(p.options) ? p.options.length : 0),
      0
    );

    // Header row
    const headers: string[] = ["Poll title", "Poll description"];
    for (let i = 1; i <= maxOptions; i++) {
      headers.push(`Normalized Option-${i} meaning`);
      headers.push(`Option-${i}`);
    }

    // Rows
    const rows = safePolls.map((p) => {
      const base = [p.title ?? "", p.description ?? ""];
      const cells: string[] = [];
      for (let i = 0; i < maxOptions; i++) {
        const opt = p.options?.[i];
        cells.push(opt?.meaning ?? "");
        cells.push(opt?.label ?? "");
      }
      return [...base, ...cells];
    });

    // Separator
    rows.push(["."]);

    // Totals row (placed in next two cells)
    const totalsRow: any[] = ["", ""];
    totalsRow.push(`total polls considered (${totalPolls ?? 0})`);
    totalsRow.push(`total votes considered (${totalVotes ?? 0})`);
    rows.push(totalsRow);

    // Build sheet
    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Polls");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "polls.xlsx");
  };

  return (
    <Button
      className="bg-emerald-800 active:bg-emerald-900 focus:bg-emerald-900 text-white"
      onClick={handleExport}
    >
      <FileDown /> Download Polls Excel
    </Button>
  );
};

export default ExportPollsButton;
