import MultiInfiniteSelect from "./base/multi-infinite-select";

type CityItem = {
  _id: string;
  name: string;
  state: { _id: string; name: string };
  country: { _id: string; name: string };
};

type Option = {
  value: string;
  label: string;
  data?: CityItem;
};

type Props = {
  value?: Option[];
  onChange?: (options: Option[]) => void;
  pageSize?: number;
  placeholder?: string;
  selectProps?: Parameters<
    typeof MultiInfiniteSelect<CityItem>
  >[0]["selectProps"];
};

export default function CitySelect({
  value,
  onChange,
  pageSize = 50,
  placeholder = "Search cities...",
  selectProps,
}: Props) {
  return (
    <MultiInfiniteSelect<CityItem>
      route="/common/location/cities"
      pageSize={pageSize}
      getFilters={(search) => ({ q: search })}
      mapItemToOption={(item) => ({
        value: item._id,
        label: `${item.name}, ${item.state.name}, ${item.country.name}`,
        data: item,
      })}
      value={value}
      onChange={onChange as any}
      placeholder={placeholder}
      selectProps={selectProps}
    />
  );
}
