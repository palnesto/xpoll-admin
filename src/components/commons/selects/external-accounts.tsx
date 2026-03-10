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
  externalAccountId?: string;
  email?: string | null;
  googleEmail?: string | null;
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
          color: "#ffffff",
        }),
        singleValue: (base: any) => ({
          ...base,
          color: "#ffffff",
        }),
        input: (base: any) => ({ ...base, color: "#ffffff" }),
        placeholder: (base: any) => ({
          ...base,
          color: "rgba(255,255,255,0.7)",
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
          color: "#ffffff",
          backgroundColor: state.isFocused
            ? "hsl(222 47% 25%)"
            : state.isSelected
              ? "hsl(222 47% 28%)"
              : "transparent",
          cursor: "pointer",
          borderRadius: "8px",
          padding: "10px 12px",
        }),
        noOptionsMessage: (base: any) => ({
          ...base,
          color: "rgba(255,255,255,0.9)",
        }),
        loadingMessage: (base: any) => ({
          ...base,
          color: "rgba(255,255,255,0.9)",
        }),
      }
      : {};

  const SingleValue = theme === "dark" ? (props: any) => (
    <components.SingleValue
      {...props}
      innerProps={{
        ...props.innerProps,
        style: {
          ...props.innerProps?.style,
          color: "#ffffff",
          opacity: 1,
        },
      }}
    >
      <span
        className="!text-white"
        style={{
          color: "#ffffff",
          display: "block",
          opacity: 1,
        }}
      >
        {props.data?.label ?? props.children}
      </span>
    </components.SingleValue>
  ) : undefined;

  const ValueContainer = theme === "dark" ? (props: any) => (
    <components.ValueContainer
      {...props}
      innerProps={{
        ...props.innerProps,
        style: {
          ...props.innerProps?.style,
          color: "#ffffff",
        },
      }}
    >
      {props.children}
    </components.ValueContainer>
  ) : undefined;

  return (
    <InfiniteSelect<ExternalAccountListItem>
      route={endpoints.users.all}
      pageSize={pageSize}
      minChars={1}
      fetchTrigger="type"
      getFilters={(search) => {
        const term = search?.trim();

        if (!term) return {};

        return {
          username: term,
      googleEmail: term,
          q: term,
        };
      }}
      mapItemToOption={(item) => {
        const email = item.email || item.googleEmail || "";
        const baseName =
          item.username ?? item.label ?? item.title ?? item.name ?? "unknown";
        const label = email ? `${baseName} • ${email}` : baseName;
        return {
          value: item.externalAccountId || item._id,
          label,
          data: item,
        };
      }}
      onChange={(opt) =>
        onChange?.(opt as ListingOption<ExternalAccountListItem> | null)
      }
      placeholder={placeholder}
      selectProps={{
        ...selectProps,
        ...(theme === "dark" && SingleValue
          ? {
            components: {
              ...selectProps?.components,
              SingleValue,
              ValueContainer,
            },
          }
          : {}),
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
              neutral80: "#ffffff",
              neutral90: "#ffffff",
              primary: "#ffffff",
              primary25: "hsl(222 47% 18%)",
              primary50: "hsl(222 47% 22%)",
            },
          }),
          classNames: {
            singleValue: () => "!text-white",
            valueContainer: () => "!text-white",
            input: () => "!text-white",
          },
        }),
        styles: {
          ...selectProps?.styles,
          ...darkStyles,
        },
      }}
    />
  );
}
