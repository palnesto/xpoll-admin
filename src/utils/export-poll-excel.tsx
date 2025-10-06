import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";

const ExportPollsButton = ({ polls, totalPolls, totalVotes }) => {
  const handleExport = () => {
    // Prepare header row
    const headers = [
      "Poll title",
      "Poll description",
      "Normalized Option-1 meaning",
      "Option-1",
      "Normalized Option-2 meaning",
      "Option-2",
      "Normalized Option-3 meaning",
      "Option-3",
      "Normalized Option-4 meaning",
      "Option-4",
    ];

    // Convert polls array into rows (polls should be array of objects)
    const rows = polls.map((p) => [
      p.title,
      p.description,
      p.opt1Meaning,
      p.opt1,
      p.opt2Meaning,
      p.opt2,
      p.opt3Meaning,
      p.opt3,
      p.opt4Meaning,
      p.opt4,
    ]);

    // Add a separator row with just "."
    rows.push(["."]);

    // Add totals row (with values in 3rd and 4th columns)
    rows.push([
      "",
      "",
      `total polls considered (${totalPolls})`,
      `total votes considered (${totalVotes})`,
    ]);

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
