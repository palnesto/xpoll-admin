import { Card } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RewardsTable, RewardsTableProps } from "./level-reward-table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";

export function RewardsAccordion(props: RewardsTableProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="rewards">
          <AccordionTrigger className="text-sm font-semibold bg-[#F0F4F9] rounded-lg p-2 text-gray-700">
            Reward Distribution
          </AccordionTrigger>
          <AccordionContent>
            <Card className="mt-2">
              <RewardsTable {...props} />
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </TooltipProvider>
  );
}
