import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export const __SYSYEM_STANDARAD_DATE_FORMAT__ = "YYYY-MM-DDTHH:mm:ss";
export const __FRONTEND_STANDARAD_DATE_FORMAT__ = "DD/MM/YYYY HH:mm:ss";

/** Convert “2025-06-20 14:00” in admin’s zone → UTC ISO string */
export const adminZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
export function localISOtoUTC(localISO: string, zone: string): string {
  return dayjs.tz(localISO, zone).utc().toISOString(); // → "2025-06-20T08:30:00.000Z"
}

/** Convert UTC ISO string → Day.js in the user’s zone */
export function utcToAdmin(utcISO: string, adminZone: string) {
  return dayjs.utc(utcISO).tz(adminZone); // Day.js instance in local zone
}

// FOR USAGE
export function localAdminISOtoUTC(localISO: string): string {
  return dayjs.tz(localISO, adminZone).utc().toISOString(); // → "2025-06-20T08:30:00.000Z"
}
export function utcToAdminFormatted(utcISO: string) {
  return utcToAdmin(utcISO, adminZone).format(
    __FRONTEND_STANDARAD_DATE_FORMAT__
  );
}
