import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type BuyConfigErrorStateProps = {
  onRetry: () => void;
};

export function BuyConfigErrorState({ onRetry }: BuyConfigErrorStateProps) {
  return (
    <Card className="border border-red-900/50 bg-red-950/20 rounded-2xl">
      <CardHeader>
        <CardTitle>Unable to load buy configs</CardTitle>
        <CardDescription>
          Check server connectivity or auth, then retry.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}
