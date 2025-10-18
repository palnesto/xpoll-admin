import MultiInfiniteSelect from "./base/multi-infinite-select";

type CountryItem = {
  _id: string;
  name: string;
  iso3?: string;
};

type Option = {
  value: string;
  label: string;
  data?: CountryItem;
};

type Props = {
  value?: Option[];
  onChange?: (options: Option[]) => void;
  pageSize?: number;
  placeholder?: string;
  selectProps?: Parameters<
    typeof MultiInfiniteSelect<CountryItem>
  >[0]["selectProps"];
};

export default function CountrySelect({
  value,
  onChange,
  pageSize = 50,
  placeholder = "Search countries...",
  selectProps,
}: Props) {
  return (
    <MultiInfiniteSelect<CountryItem>
      route="/common/location/countries"
      pageSize={pageSize}
      getFilters={(search) => ({ q: search })}
      mapItemToOption={(item) => ({
        value: item._id,
        label: item.name,
        data: item,
      })}
      value={value}
      onChange={onChange as any}
      placeholder={placeholder}
      selectProps={selectProps}
    />
  );
}
