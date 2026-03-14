import type { UseFormReturn } from "react-hook-form";
import { NumberField } from "@/components/commons/form/NumberField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INKD_CREATE_INPUT_CLASS } from "./constants";
import CountrySelect from "@/components/commons/selects/country-select";
import StateSelect from "@/components/commons/selects/state-select";
import CitySelect from "@/components/commons/selects/city-select";
import IndustryInfiniteSelect from "@/components/commons/selects/industry-infinite-select";
import { inkdAgentCreateFormSchema } from "@/schema/inkd-agent-create.schema";

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
  const { formState: { errors } } = form;

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
        inputClassName={INKD_CREATE_INPUT_CLASS}
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
        inputClassName={INKD_CREATE_INPUT_CLASS}
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
        inputClassName={INKD_CREATE_INPUT_CLASS}
        className="text-[#5E6366]"
      />

      <div className="col-span-3 grid grid-cols-3 gap-6">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-[#6c6c76]">
            Country
          </Label>
          <CountrySelect
            value={countryOpts}
            onChange={(opts) => setCountryOpts(opts as GeoOption[])}
            placeholder="Rhode Island"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-[#6c6c76]">
            State
          </Label>
          <StateSelect
            value={stateOpts}
            onChange={(opts) => setStateOpts(opts as GeoOption[])}
            placeholder="Rhode Island"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-[#6c6c76]">
            City
          </Label>
          <CitySelect
            value={cityOpts}
            onChange={(opts) => setCityOpts(opts as GeoOption[])}
            placeholder="Rhode Island"
          />
        </div>

        <div className="col-span-3 space-y-1">
          <Label className="text-xs font-semibold text-[#6c6c76]">
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

        {/* <div className="col-span-3 space-y-1">
          <Label className="text-xs font-semibold text-[#6c6c76]">
            Fallback image URL (optional)
          </Label>
          <Input
            type="url"
            placeholder="https://example.com/source-1.jpg"
            className={INKD_CREATE_INPUT_CLASS}
            {...form.register("fallbackImageUrl")}
          />
          {errors.fallbackImageUrl && (
            <p className="text-xs text-red-600">
              {errors.fallbackImageUrl.message as string}
            </p>
          )}
        </div> */}
      </div>
    </div>
  );
}
