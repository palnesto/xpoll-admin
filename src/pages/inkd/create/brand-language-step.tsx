import type { UseFormReturn } from "react-hook-form";
import { TextAreaField } from "@/components/commons/form/TextAreaField";
import { inkdAgentCreateFormSchema } from "@/schema/inkd-agent-create.schema";
import { INKD_CREATE_INPUT_CLASS } from "./constants";

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
        inputClassName={INKD_CREATE_INPUT_CLASS}
      />
    </div>
  );
}
