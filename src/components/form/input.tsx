import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

interface FormInputProps extends React.ComponentProps<typeof Input> {
  label?: string;
  description?: string;
}

export function FormInput({
  label,
  description,
  className,
  ...props
}: FormInputProps) {
  return (
    <FormItem>
      {label && <FormLabel className="font-light">{label}</FormLabel>}
      <FormControl>
        <Input
          className={cn("border-zinc-800 border-2 outline-none", className)}
          {...props}
        />
      </FormControl>
      {description && <FormDescription>{description}</FormDescription>}
      <FormMessage />
    </FormItem>
  );
}
