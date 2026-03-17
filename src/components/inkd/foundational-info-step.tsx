import type { UseFormReturn } from "react-hook-form";
import { TextField } from "@/components/commons/form/TextField";
import { TextAreaField } from "@/components/commons/form/TextAreaField";
import { inkdAgentCreateFormSchema } from "@/schema/inkd-agent-create.schema";

const INPUT_CLASS =
  "border-[#DDE2E5] focus:border-[#E8EAED] focus:ring-1 focus:ring-[#E8EAED] focus-visible:outline-none text-[#111] placeholder:text-[#9a9aab]";

export type NameStatus = "idle" | "checking" | "available" | "unavailable" | "error";

type FormValues = import("@/schema/inkd-agent-create.schema").InkdAgentCreateFormValues;

type Props = {
  form: UseFormReturn<FormValues>;
  nameStatus: NameStatus;
  /** When set, show name as read-only (edit mode; name not sent in PATCH) */
  editMode?: { name: string };
};

export function FoundationalInfoStep({ form, nameStatus, editMode }: Props) {
  return (
    <div className="space-y-8">
      {editMode ? (
        <div className="space-y-1">
          <label className="text-xs font-medium text-[#5E6366]">
            Name of AI Signal
          </label>
          <div className="rounded-md border border-[#DDE2E5] bg-[#f8f9fa] px-3 py-2 text-[#111]">
            {editMode.name}
          </div>
        </div>
      ) : (
        <>
          <TextField<FormValues>
            form={form}
            schema={inkdAgentCreateFormSchema}
            name="name"
            label="Name of AI Signal"
            placeholder="Sample Name"
            showCounter
            showError
            className="text-black"
            inputClassName={INPUT_CLASS}
          />
          <div className="text-xs text-[#8c8c99]">
            {nameStatus === "checking" && "Checking name availability…"}
            {nameStatus === "available" && "Name is available."}
            {nameStatus === "unavailable" &&
              "Name is already in use. Choose another."}
            {nameStatus === "error" &&
              "Could not verify name. Please try again."}
          </div>
        </>
      )}

      <TextAreaField<FormValues>
        form={form}
        schema={inkdAgentCreateFormSchema}
        name="foundationalInformation"
        label="Add Core values of the AI"
        rows={10}
        showCounter
        showError
        className="text-black"
        inputClassName={INPUT_CLASS}
      />
    </div>
  );
}
