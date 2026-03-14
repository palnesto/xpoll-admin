import type { UseFormReturn } from "react-hook-form";
import { TextAreaField } from "@/components/commons/form/TextAreaField";
import { inkdAgentCreateFormSchema } from "@/schema/inkd-agent-create.schema";

const INPUT_CLASS =
  "border-[#DDE2E5] focus:border-[#E8EAED] focus:ring-1 focus:ring-[#E8EAED] focus-visible:outline-none text-[#111] placeholder:text-[#9a9aab]";

type FormValues = import("@/schema/inkd-agent-create.schema").InkdAgentCreateFormValues;

type Props = {
  form: UseFormReturn<FormValues>;
};

export function BrandLanguageStep({ form }: Props) {
  return (
    <div className="space-y-8">
      <TextAreaField<FormValues>
        form={form}
        schema={inkdAgentCreateFormSchema}
        name="brandLanguage"
        label="Write tonality of the AI"
        rows={14}
        showCounter
        showError
        inputClassName={INPUT_CLASS}
      />
    </div>
  );
}
