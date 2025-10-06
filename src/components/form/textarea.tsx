import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

interface FormTextareaProps extends React.ComponentProps<typeof Textarea> {
  label?: string;
  description?: string;
}

export function FormTextarea({
  label,
  description,
  className,
  ...props
}: FormTextareaProps) {
  return (
    <FormItem>
      {label && <FormLabel className="font-light">{label}</FormLabel>}
      <FormControl>
        <Textarea
          className={cn(
            "border-zinc-800 border-2 resize-none h-32 overflow-y-auto outline-none focus:border-white/70",
            className
          )}
          {...props}
        />
      </FormControl>
      {description && <FormDescription>{description}</FormDescription>}
      <FormMessage />
    </FormItem>
  );
}
