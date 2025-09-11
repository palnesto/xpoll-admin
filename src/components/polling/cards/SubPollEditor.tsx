import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ResourceAssetsEditor from "../editors/ResourceAssetsEditor";
import OptionsEditor from "../editors/OptionsEditor";
import type { Control } from "react-hook-form";

// NEW: shadcn form wrappers to show errors
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

type Props = {
  control: Control<any>;
  index: number; // index in polls[]
  onRemove: () => void;
  disableRemove?: boolean;
  title?: string;
};

export default function SubPollEditor({
  control,
  index,
  onRemove,
  disableRemove,
  title = "Poll",
}: Props) {
  const base = `polls.${index}`;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>
          {title} #{index + 1}
        </CardTitle>
        <Button
          type="button"
          variant="outline"
          onClick={onRemove}
          disabled={disableRemove}
        >
          Remove
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Title with error */}
        <div className="space-y-2">
          <FormField
            control={control}
            name={`${base}.title`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Title</FormLabel>
                <FormControl>
                  <Input placeholder="Poll title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Description with error */}
        <div className="space-y-2">
          <FormField
            control={control}
            name={`${base}.description`}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  Description
                </FormLabel>
                <FormControl>
                  <Input placeholder="Short description" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <ResourceAssetsEditor
          control={control}
          name={`${base}.resourceAssets`}
          label="Media (Images / YouTube)"
        />

        <OptionsEditor
          control={control}
          name={`${base}.options`}
          label="Options (2–4)"
          min={2}
          max={4}
        />
      </CardContent>
    </Card>
  );
}
