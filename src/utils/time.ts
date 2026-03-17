import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {
  INKD_INTERNAL_AGENT_WEEKDAYS,
  type InkdInternalAgentWeekday,
} from "@/constants/inkd";

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

export function utcToAdminNextScheduleLabel(utcISO: string) {
  const localDateTime = utcToAdmin(utcISO, adminZone);
  if (!localDateTime.isValid()) return "";

  const now = dayjs().tz(adminZone);
  const startOfToday = now.startOf("day");
  const startOfTomorrow = startOfToday.add(1, "day");

  let prefix = localDateTime.format("ddd, MMM D");
  if (localDateTime.isSame(startOfToday, "day")) {
    prefix = "Today";
  } else if (localDateTime.isSame(startOfTomorrow, "day")) {
    prefix = "Tomorrow";
  }

  return `${prefix} • ${localDateTime.format("h:mm A")} ${adminZone}`;
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

function getWeekdayIndex(weekday: InkdInternalAgentWeekday) {
  return INKD_INTERNAL_AGENT_WEEKDAYS.indexOf(weekday);
}

function getReferenceMondayInAdminZone() {
  const today = dayjs().tz(adminZone).startOf("day");
  const mondayOffset = (today.day() + 6) % 7;
  return today.subtract(mondayOffset, "day");
}

function getReferenceMondayInUtc() {
  const today = dayjs.utc().startOf("day");
  const mondayOffset = (today.day() + 6) % 7;
  return today.subtract(mondayOffset, "day");
}

function sortWeekdays(weekdays: InkdInternalAgentWeekday[]) {
  return [...weekdays].sort((left, right) => getWeekdayIndex(left) - getWeekdayIndex(right));
}

export function localScheduleRuleToUtc(rule: {
  weekdays?: InkdInternalAgentWeekday[];
  timeUtc?: string;
}) {
  const localTime = String(rule.timeUtc ?? "").trim();
  const weekdays = Array.isArray(rule.weekdays) ? rule.weekdays : [];
  if (!localTime) {
    return {
      weekdays: sortWeekdays(Array.from(new Set(weekdays))),
      timeUtc: "",
    };
  }

  const [hours, minutes] = localTime.split(":").map((value) => Number.parseInt(value, 10));
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return {
      weekdays: sortWeekdays(Array.from(new Set(weekdays))),
      timeUtc: "",
    };
  }

  const referenceMonday = getReferenceMondayInAdminZone();
  const utcWeekdays = weekdays
    .map((weekday) => {
      const weekdayIndex = getWeekdayIndex(weekday);
      if (weekdayIndex < 0) return null;

      const localDateTime = referenceMonday
        .add(weekdayIndex, "day")
        .hour(hours)
        .minute(minutes)
        .second(0)
        .millisecond(0);
      const utcDateTime = localDateTime.utc();
      const utcWeekdayIndex = (utcDateTime.day() + 6) % 7;
      return INKD_INTERNAL_AGENT_WEEKDAYS[utcWeekdayIndex] ?? null;
    })
    .filter(Boolean) as InkdInternalAgentWeekday[];

  const utcDateTime = referenceMonday
    .hour(hours)
    .minute(minutes)
    .second(0)
    .millisecond(0)
    .utc();

  return {
    weekdays: sortWeekdays(Array.from(new Set(utcWeekdays))),
    timeUtc: utcDateTime.format("HH:mm"),
  };
}

export function utcScheduleRuleToLocal(rule: {
  weekdays?: InkdInternalAgentWeekday[];
  timeUtc?: string;
}) {
  const utcTime = String(rule.timeUtc ?? "").trim();
  const weekdays = Array.isArray(rule.weekdays) ? rule.weekdays : [];
  if (!utcTime) {
    return {
      weekdays: sortWeekdays(Array.from(new Set(weekdays))),
      timeUtc: "",
    };
  }

  const [hours, minutes] = utcTime.split(":").map((value) => Number.parseInt(value, 10));
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return {
      weekdays: sortWeekdays(Array.from(new Set(weekdays))),
      timeUtc: "",
    };
  }

  const referenceMondayUtc = getReferenceMondayInUtc();
  const localWeekdays = weekdays
    .map((weekday) => {
      const weekdayIndex = getWeekdayIndex(weekday);
      if (weekdayIndex < 0) return null;

      const utcDateTime = referenceMondayUtc
        .add(weekdayIndex, "day")
        .hour(hours)
        .minute(minutes)
        .second(0)
        .millisecond(0);
      const localDateTime = utcDateTime.tz(adminZone);
      const localWeekdayIndex = (localDateTime.day() + 6) % 7;
      return INKD_INTERNAL_AGENT_WEEKDAYS[localWeekdayIndex] ?? null;
    })
    .filter(Boolean) as InkdInternalAgentWeekday[];

  const localDateTime = referenceMondayUtc
    .hour(hours)
    .minute(minutes)
    .second(0)
    .millisecond(0)
    .tz(adminZone);

  return {
    weekdays: sortWeekdays(Array.from(new Set(localWeekdays))),
    timeUtc: localDateTime.format("HH:mm"),
  };
}
