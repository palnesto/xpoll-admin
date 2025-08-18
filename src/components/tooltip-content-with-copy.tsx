import { useState } from "react";
import { Copy, CopyCheck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ReactNode } from "react";
import { truncateText } from "@/utils/formatter";

type TooltipWithCopyProps = {
  children: ReactNode;
  tooltipText: string;
};
const TooltipContentWithCopy = ({
  children,
  copyText,
}: {
  children: any;
  copyText: string;
}) => {
  const [copyStatus, setCopyStatus] = useState("");
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopyStatus("Copied!");
      setTimeout(() => setCopyStatus(""), 2000); // Reset status after 2 seconds
    } catch (err) {
      setCopyStatus("Failed to copy!");
      setTimeout(() => setCopyStatus(""), 2000); // Reset status after 2 seconds
    }
  };
  return (
    <TooltipContent>
      <div className="flex gap-2 items-center">
        <p className="bg-foreground text-background p-2 rounded-lg">
          {children}
        </p>
        <button
          className="bg-foreground text-background p-2 rounded-lg hover:bg-background/20"
          onClick={handleCopy}
        >
          {copyStatus ? (
            <CopyCheck className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>
    </TooltipContent>
  );
};

export const TooltipWithCopy: React.FC<TooltipWithCopyProps> = ({
  children,
  tooltipText,
}) => {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContentWithCopy copyText={tooltipText}>
          {truncateText(tooltipText, 78)}
        </TooltipContentWithCopy>
      </Tooltip>
    </TooltipProvider>
  );
};
