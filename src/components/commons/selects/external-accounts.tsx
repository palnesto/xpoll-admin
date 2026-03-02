import { endpoints } from "@/api/endpoints";
import InfiniteSelect, { InfiniteSelectProps } from "./base/infinite-select";
import { components } from "react-select";

export type ListingOption<T> = {
  value: string;
  label: string;
  data?: T;
};

type SelectPropsFor<T> = InfiniteSelectProps<T>["selectProps"];

export type ExternalAccountListItem = {
  _id: string;
  username?: string;
  name?: string;
  title?: string;
  label?: string;
};

type ExternalAccountSelectProps = {
  onChange?: (option: ListingOption<ExternalAccountListItem> | null) => void;
  pageSize?: number;
  placeholder?: string;
  selectProps?: SelectPropsFor<ExternalAccountListItem>;
  /** When true, uses white text/transparent bg (default for sidebar). When false, uses default theme. */
  theme?: "dark" | "light";
};

export function ExternalAccountSelect({
  onChange,
  pageSize = 50,
  placeholder = "Search user...",
  selectProps,
  theme = "dark",
}: ExternalAccountSelectProps) {
  const darkStyles =
    theme === "dark"
      ? {
          menuPortal: (base: any) => ({
            ...base,
            zIndex: 9999,
            pointerEvents: "auto",
          }),
          control: (base: any) => ({
            ...base,
            background: "linear-gradient(135deg, hsl(222 47% 11%) 0%, hsl(222 47% 15%) 100%)",
            borderColor: "hsl(222 47% 22%)",
            minHeight: "44px",
          }),
          valueContainer: (base: any) => ({
            ...base,
            color: "#fff",
          }),
          singleValue: (base: any) => ({
            ...base,
            color: "#fff",
          }),
          input: (base: any) => ({ ...base, color: "#fff" }),
          placeholder: (base: any) => ({
            ...base,
            color: "rgba(255,255,255,0.6)",
          }),
          menu: (base: any) => ({
            ...base,
            background: "linear-gradient(180deg, hsl(222 47% 11%) 0%, hsl(222 47% 8%) 100%)",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 10px 40px -10px rgba(0,0,0,0.5)",
          }),
          menuList: (base: any) => ({
            ...base,
            background: "transparent",
            padding: "4px",
          }),
          option: (base: any, state: any) => ({
            ...base,
            color: "#fff",
            backgroundColor: state.isFocused
              ? "hsl(222 47% 18%)"
              : state.isSelected
                ? "hsl(222 47% 22%)"
                : "transparent",
            cursor: "pointer",
            borderRadius: "8px",
            padding: "10px 12px",
          }),
          noOptionsMessage: (base: any) => ({
            ...base,
            color: "rgba(255,255,255,0.7)",
          }),
          loadingMessage: (base: any) => ({
            ...base,
            color: "rgba(255,255,255,0.7)",
          }),
        }
      : {};

  const SingleValue = theme === "dark" ? (props: any) => (
    <components.SingleValue
      {...props}
      innerProps={{
        ...props.innerProps,
        style: { ...props.innerProps?.style, color: "#fff" },
      }}
    >
      <span className="!text-white" style={{ color: "#ffffff" }}>
        {props.data?.label ?? props.children}
      </span>
    </components.SingleValue>
  ) : undefined;

  return (
    <InfiniteSelect<ExternalAccountListItem>
      route={endpoints.users.all}
      pageSize={pageSize}
      getFilters={(search) => ({
        q: search || undefined,
      })}
      mapItemToOption={(item) => ({
        value: item._id,
        label: item.username ?? item.label ?? item.title ?? item.name ?? item._id,
        data: item,
      })}
      onChange={(opt) =>
        onChange?.(opt as ListingOption<ExternalAccountListItem> | null)
      }
      placeholder={placeholder}
      selectProps={{
        ...selectProps,
        ...(SingleValue && {
          components: {
            ...selectProps?.components,
            SingleValue,
          },
        }),
        ...(theme === "dark" && {
          theme: (theme: any) => ({
            ...theme,
            colors: {
              ...theme.colors,
              neutral0: "hsl(222 47% 11%)",
              neutral5: "hsl(222 47% 15%)",
              neutral10: "hsl(222 47% 18%)",
              neutral20: "hsl(222 47% 22%)",
              neutral50: "rgba(255,255,255,0.6)",
              neutral80: "#fff",
              neutral90: "#fff",
              primary: "#fff",
              primary25: "hsl(222 47% 18%)",
              primary50: "hsl(222 47% 22%)",
            },
          }),
        }),
        styles: {
          ...selectProps?.styles,
          ...darkStyles,
        },
      }}
    />
  );
}
