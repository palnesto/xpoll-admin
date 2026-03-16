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
export function utcToAdmin(utcISO: string, zone: string) {
  return dayjs.utc(utcISO).tz(zone); // Day.js instance in local zone
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

export function utcToAdminTimeWithZone(utcISO: string) {
  const localDateTime = utcToAdmin(utcISO, adminZone);
  if (!localDateTime.isValid()) return "";
  return `${localDateTime.format("h:mm A")} ${adminZone}`;
}

/** Convert local HH:MM (admin zone) → UTC HH:MM */
export function localTimeToUtcHHMM(localHHMM: string): string {
  const clean = String(localHHMM ?? "").trim();
  if (!clean) return "";
  const today = dayjs().format("YYYY-MM-DD");
  const localISO = `${today}T${clean}:00`;
  const utcISO = localAdminISOtoUTC(localISO);
  return dayjs.utc(utcISO).format("HH:mm");
}

/** Convert UTC HH:MM → local HH:MM (admin zone) */
export function utcHHMMToLocalHHMM(utcHHMM: string): string {
  const clean = String(utcHHMM ?? "").trim();
  if (!clean) return "";
  const today = dayjs().format("YYYY-MM-DD");
  const utcISO = `${today}T${clean}:00Z`;
  return utcToAdmin(utcISO, adminZone).format("HH:mm");
}
