// src/utils/export-poll-excel.tsx
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";

/**
 * Expected shape of `polls`:
 * [
 *   {
 *     _id: string,
 *     title: string,
 *     description: string,
 *     options: Array<{ meaning: string; label: string }> // label already includes "(archived)" and "(votes)"
 *   }
 * ]
 */
type PollOption = { meaning: string; label: string };
type PollRow = {
  _id: string;
  title: string;
  description: string;
  options: PollOption[];
};

type Props = {
  polls: PollRow[];
  totalPolls: number;
  totalVotes: number;
};

const ExportPollsButton = ({ polls, totalPolls, totalVotes }: Props) => {
  const handleExport = () => {
    const safePolls = Array.isArray(polls) ? polls : [];

    // Determine the maximum number of options across all polls (dynamic columns)
    const maxOptions = safePolls.reduce(
      (m, p) => Math.max(m, (p.options || []).length),
      0
    );

    // Prepare header row
    const headers: string[] = ["Poll title", "Poll description"];
    for (let i = 1; i <= maxOptions; i++) {
      headers.push(`Normalized Option-${i} meaning`);
      headers.push(`Option-${i}`);
    }

    // Convert polls array into rows
    const rows = safePolls.map((p) => {
      const base = [p.title, p.description];

      // Fill dynamic option columns
      const cells: string[] = [];
      for (let i = 0; i < maxOptions; i++) {
        const opt = p.options?.[i];
        cells.push(opt?.meaning ?? "");
        cells.push(opt?.label ?? "");
      }

      return [...base, ...cells];
    });

    // Add a separator row with just "."
    rows.push(["."]);

    // Add totals row (values in 3rd and 4th visible columns)
    const totalsRow: any[] = ["", ""];
    // pad until we reach at least 2 extra columns to place totals nicely
    // (headers length already accounts for dynamic options, but the totals text is independent)
    totalsRow.push(`total polls considered (${totalPolls})`);
    totalsRow.push(`total votes considered (${totalVotes})`);

    rows.push(totalsRow);

    // Combine header + data
    const worksheetData = [headers, ...rows];

    // Create worksheet and workbook
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Polls");

    // Export
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, "polls.xlsx");
  };

  return <Button onClick={handleExport}>Download Polls Excel</Button>;
};

export default ExportPollsButton;
