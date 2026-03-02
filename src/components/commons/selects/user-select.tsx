// // src/components/commons/selects/admin-user-select.tsx
// import Select, { components, type OptionProps, type SingleValueProps } from "react-select";
// import InfiniteSelect from "@/components/commons/selects/base/infinite-select";
// import { endpoints } from "@/api/endpoints"; 
// import { LEVELS } from "@/utils/levelConfig";
// import { ComponentProps } from "react";

// export type AdminExternalUserLite = {
//   _id: string;
//   role: "user";
//   googleEmail: string | null;
//   twitterUsername: string | null;
//   twitterName: string | null;
//   isBot?: boolean;
//   archivedAt?: string | null;
//   createdAt?: string | null;
//   updatedAt?: string | null;
//   email: string | null;
//   externalAccountId: string;
//   providers?: string[];
//   username: string | null;
//   civicScore: number | null;
//   level: number | null;
//   gender: string | null;
//   avatar: { _id: string; name: string; imageUrl: string } | null;
//   location?: {
//     countryId?: string | null;
//     stateId?: string | null;
//     cityId?: string | null;
//     countryName?: string | null;
//     stateName?: string | null;
//     cityName?: string | null;
//   } | null;
// };

// type Filters = {
//   q?: string;
//   page?: number;
//   pageSize?: number;
// } & Record<string, unknown>;

// type UserOption = {
//   value: string;
//   label: string;
//   data?: AdminExternalUserLite;
// };

// const LevelBadge = ({ levelId }: { levelId: number | null }) => {
//   const lvl = LEVELS.find((l) => l.id === (levelId ?? 1)) ?? LEVELS[0];

//   return (
//     <div className="shrink-0 flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2 py-1">
//       <img src={lvl.image} alt={lvl.title} className="h-4 w-4" />
//       <span className="hidden sm:inline text-xs font-medium text-gray-900">
//         {lvl.title}
//       </span>
//     </div>
//   );
// };

// const Avatar = ({ u }: { u: AdminExternalUserLite }) => {
//   const url = u.avatar?.imageUrl;
//   const fallback = (u.username?.[0] ?? u.email?.[0] ?? u.googleEmail?.[0] ?? "U").toUpperCase();

//   return url ? (
//     <img
//       src={url}
//       alt={u.avatar?.name ?? "avatar"}
//       className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover"
//     />
//   ) : (
//     <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-sm font-semibold">
//       {fallback}
//     </div>
//   );
// };

// function buildLocationLine(u: AdminExternalUserLite) {
//   const loc = u.location;
//   const parts = [loc?.cityName, loc?.stateName, loc?.countryName].filter(Boolean);
//   return parts.length ? parts.join(", ") : null;
// }

// const UserOptionRow = (props: OptionProps<UserOption, false>) => {
//   const u = props.data?.data;
//   if (!u) return <components.Option {...props}>{props.label}</components.Option>;

//   const username = u.username ?? "unknown";
//   const email = u.email ?? u.googleEmail ?? null;
//   const locationLine = buildLocationLine(u);

//   return (
//     <components.Option {...props}>
//       <div className="flex items-center gap-3">
//         <Avatar u={u} />
//         <div className="min-w-0 flex-1">
//           <div className="flex items-center justify-between gap-2">
//             <div className="min-w-0">
//               <div className="truncate text-sm font-semibold text-gray-900">
//                 {username}
//               </div>

//               {email ? (
//                 <div className="truncate text-xs text-gray-600">
//                   {email}
//                 </div>
//               ) : null}

//               {locationLine ? (
//                 <div className="truncate text-[11px] text-gray-500">
//                   {locationLine}
//                 </div>
//               ) : null}
//             </div>

//             <LevelBadge levelId={u.level ?? 1} />
//           </div>
//         </div>
//       </div>
//     </components.Option>
//   );
// };

// const UserSingleValue = (props: SingleValueProps<UserOption, false>) => {
//   const u = props.data?.data;
//   if (!u) {
//     return <components.SingleValue {...props}>{props.data.label}</components.SingleValue>;
//   }

//   const username = u.username ?? "unknown";
//   const email = u.email ?? u.googleEmail ?? null;

//   return (
//     <components.SingleValue {...props}>
//       <div className="flex items-center gap-2 min-w-0">
//         <div className="shrink-0">
//           <Avatar u={u} />
//         </div>
//         <div className="min-w-0">
//           <div className="truncate text-sm font-semibold text-gray-900">
//             {username}
//           </div>
//           {email ? (
//             <div className="truncate text-xs text-gray-600">
//               {email}
//             </div>
//           ) : null}
//         </div>
//       </div>
//     </components.SingleValue>
//   );
// };

// export default function AdminUserSelect({
//   onChange,
//   placeholder = "Search user by username/email...",
//   route = endpoints.users.advancedListing,
//   queryParams,
//   getQueryParams,
//   pageSize = 25,
//   selectProps,
// }: {
//   onChange?: (user: AdminExternalUserLite | null) => void;
//   placeholder?: string;
//   route?: string;
//   queryParams?: Record<string, unknown>;
//   getQueryParams?: (search: string) => Record<string, unknown>;
//   pageSize?: number;
//   selectProps?: Partial<ComponentProps<typeof Select<UserOption>>>;
// }) {
//   return (
//     <InfiniteSelect<AdminExternalUserLite, Filters>
//       route={route}
//       pageSize={pageSize}
//       minChars={1}
//       fetchTrigger="type"
//       placeholder={placeholder}
//       getFilters={(search) => {
//         const base: Filters = {
//           pageSize,
//           ...(getQueryParams ? getQueryParams(search) : queryParams),
//         };

//         const term = search?.trim();
//         if (term) base.q = term;
//         else delete base.q;

//         return base;
//       }}
//       mapItemToOption={(u) => {
//         const email = u.email || u.googleEmail || "";
//         const label = email ? `${u.username ?? "unknown"} • ${email}` : (u.username ?? "unknown");
//         return {
//           value: u.externalAccountId || u._id,
//           label,
//           data: u,
//         };
//       }}
//       onChange={(opt) => onChange?.(opt?.data ?? null)}
//       selectProps={{
//         classNamePrefix: "admin-user-select",
//         menuPortalTarget: document.body,
//         menuPosition: "fixed",
//         noOptionsMessage: () => "Start typing to search users",
//         components: {
//           Option: UserOptionRow,
//           SingleValue: UserSingleValue,
//           ...(selectProps?.components ?? {}),
//         },
//         styles: {
//           menuPortal: (base) => ({ ...base, zIndex: 100000 }),
//           menu: (base) => ({ ...base, zIndex: 100000 }),
//           ...(selectProps?.styles ?? {}),
//         },
//         ...(selectProps ?? {}),
//       }}
//     />
//   );
// }
