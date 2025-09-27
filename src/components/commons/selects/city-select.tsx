// import InfiniteSelect from "./base/infinite-select";

// type CityItem = {
//   _id: string;
//   name: string;
//   state: { _id: string; name: string };
//   country: { _id: string; name: string };
//   label?: string;
// };

// type Option = {
//   value: string;
//   label: string;
//   data?: CityItem;
// };

// type Props = {
//   onChange?: (option: Option | null) => void;
//   pageSize?: number;
//   placeholder?: string;
//   selectProps?: Parameters<typeof InfiniteSelect<CityItem>>[0]["selectProps"];
// };

// export function CitySelect({
//   onChange,
//   pageSize = 50,
//   placeholder = "Search city...",
//   selectProps,
// }: Props) {
//   return (
//     <InfiniteSelect<CityItem>
//       route="/common/location/cities"
//       pageSize={pageSize}
//       getFilters={(search) => ({ q: search })}
//       mapItemToOption={(item) => ({
//         value: item._id,
//         label: `${item.name}, ${item.state.name}, ${item.country.name}`,
//         data: item,
//       })}
//       onChange={(opt) => {
//         if (opt?.data) {
//           console.log("Selected location:", {
//             cityId: opt.data._id,
//             city: opt.data.name,
//             state: opt.data.state,
//             country: opt.data.country,
//           });
//         }
//         onChange?.(opt as Option | null);
//       }}
//       placeholder={placeholder}
//       selectProps={selectProps}
//     />
//   );
// }
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
