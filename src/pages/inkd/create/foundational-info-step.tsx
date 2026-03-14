import type { UseFormReturn } from "react-hook-form";
import { TextField } from "@/components/commons/form/TextField";
import { TextAreaField } from "@/components/commons/form/TextAreaField";
import { inkdAgentCreateFormSchema } from "@/schema/inkd-agent-create.schema";
import { INKD_CREATE_INPUT_CLASS } from "./constants";

export type NameStatus = "idle" | "checking" | "available" | "unavailable" | "error";

type FormValues = import("@/schema/inkd-agent-create.schema").InkdAgentCreateFormValues;

type Props = {
  form: UseFormReturn<FormValues>;
  nameStatus: NameStatus;
};

export function FoundationalInfoStep({ form, nameStatus }: Props) {
  return (
    <div className="space-y-8">
      <TextField<FormValues>
        form={form}
        schema={inkdAgentCreateFormSchema}
        name="name"
        label="Name of AI Signal"
        placeholder="Sample Name"
        showCounter
        showError
        inputClassName={INKD_CREATE_INPUT_CLASS}
      />
      <div className="text-xs text-[#8c8c99]">
        {nameStatus === "checking" && "Checking name availability…"}
        {nameStatus === "available" && "Name is available."}
        {nameStatus === "unavailable" &&
          "Name is already in use. Choose another."}
        {nameStatus === "error" &&
          "Could not verify name. Please try again."}
      </div>

      <TextAreaField<FormValues>
        form={form}
        schema={inkdAgentCreateFormSchema}
        name="foundationalInformation"
        label="Add Core values of the AI"
        rows={10}
        showCounter
        showError
        inputClassName={INKD_CREATE_INPUT_CLASS}
      />
    </div>
  );
}
