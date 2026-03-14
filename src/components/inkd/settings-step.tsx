import type { UseFormReturn } from "react-hook-form";
import { NumberField } from "@/components/commons/form/NumberField";
import { Label } from "@/components/ui/label";
import CountrySelect from "@/components/commons/selects/country-select";
import StateSelect from "@/components/commons/selects/state-select";
import CitySelect from "@/components/commons/selects/city-select";
import IndustryInfiniteSelect from "@/components/commons/selects/industry-infinite-select";
import { inkdAgentCreateFormSchema } from "@/schema/inkd-agent-create.schema";

const INPUT_CLASS =
  "border-[#DDE2E5] focus:border-[#E8EAED] focus:ring-1 focus:ring-[#E8EAED] focus-visible:outline-none text-[#111] placeholder:text-[#9a9aab]";

type FormValues = import("@/schema/inkd-agent-create.schema").InkdAgentCreateFormValues;

export type GeoOption = { value: string; label: string };
export type IndustryOption = { value: string; label: string };

type Props = {
  form: UseFormReturn<FormValues>;
  countryOpts: GeoOption[];
  setCountryOpts: (opts: GeoOption[]) => void;
  stateOpts: GeoOption[];
  setStateOpts: (opts: GeoOption[]) => void;
  cityOpts: GeoOption[];
  setCityOpts: (opts: GeoOption[]) => void;
  industryOpts: IndustryOption[];
  setIndustryOpts: (opts: IndustryOption[]) => void;
};

export function SettingsStep({
  form,
  countryOpts,
  setCountryOpts,
  stateOpts,
  setStateOpts,
  cityOpts,
  setCityOpts,
  industryOpts,
  setIndustryOpts,
}: Props) {
  return (
    <div className="grid grid-cols-3 gap-6">
      <NumberField<FormValues>
        form={form}
        schema={inkdAgentCreateFormSchema}
        name="maxBlogDescriptionLength"
        label="Blog length"
        placeholder="10000"
        decimalScale={0}
        helperText="Characters per blog description"
        showError
        inputClassName={INPUT_CLASS}
        className="text-[#5E6366]"
      />
      <NumberField<FormValues>
        form={form}
        schema={inkdAgentCreateFormSchema}
        name="maxLinkedTrial"
        label="No of trails to be create per blog"
        placeholder="12"
        decimalScale={0}
        showError
        inputClassName={INPUT_CLASS}
        className="text-[#5E6366]"
      />
      <NumberField<FormValues>
        form={form}
        schema={inkdAgentCreateFormSchema}
        name="maxLinkedPoll"
        label="No of polls per trail"
        placeholder="12"
        decimalScale={0}
        showError
        inputClassName={INPUT_CLASS}
        className="text-[#5E6366]"
      />

      <div className="col-span-3 grid grid-cols-3 gap-6">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-[#5E6366]">
            Country
          </Label>
          <CountrySelect
            value={countryOpts}
            onChange={(opts) => setCountryOpts(opts as GeoOption[])}
            placeholder="Rhode Island"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-[#5E6366]">
            State
          </Label>
          <StateSelect
            value={stateOpts}
            onChange={(opts) => setStateOpts(opts as GeoOption[])}
            placeholder="Rhode Island"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-[#5E6366]">
            City
          </Label>
          <CitySelect
            value={cityOpts}
            onChange={(opts) => setCityOpts(opts as GeoOption[])}
            placeholder="Rhode Island"
          />
        </div>

        <div className="col-span-3 space-y-1">
          <Label className="text-xs font-semibold text-[#5E6366]">
            Targeted Industries
          </Label>
          <IndustryInfiniteSelect
            onChange={(opt) =>
              setIndustryOpts(
                opt ? [{ value: opt.value, label: opt.label }] : [],
              )
            }
            placeholder="Finance, Healthcare…"
          />
        </div>
      </div>
    </div>
  );
}
