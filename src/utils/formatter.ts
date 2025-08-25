import _ from "lodash";
import relativeTime from "dayjs/plugin/relativeTime";
import dayjs from "dayjs";
dayjs.extend(relativeTime);
export const internaltionalNumberFormatter = new Intl.NumberFormat("en-US", {
  compactDisplay: "short",
});

export function appStandardDateFormatter2(dateInput: Date | string): string {
  const date = dayjs(dateInput);
  if (!date.isValid()) {
    return "invalid date";
  }
  return date.format("YYYY-MM-DD");
}
export function appStandardDateFormatter(dateInput: Date | string): string {
  const date = dayjs(dateInput);
  if (!date.isValid()) {
    return "invalid date";
  }
  return date.format("MMM DD YYYY");
}

export function appStandardDateTimeFormatter(dateInput: Date | string): string {
  const date = dayjs(dateInput);
  if (!date.isValid()) {
    return "invalid date-time";
  }
  return date.format("MMM DD YYYY, HH:mm");
}
export function formatToTwoDecimalPlaces(num: number): string {
  return _.round(num, 2).toFixed(2);
}

export const relativeAgoTimeFormatter = (date: Date) => dayjs().to(dayjs(date));

export const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
};

export function convertToProperCase(inputString: string): string {
  // Replace underscores with spaces and capitalize the first letter of each word
  return inputString
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
}

export function getInitials(name: string): string {
  // Split the name into words
  const words = name.trim().split(/\s+/);

  // Get the first two letters as initials
  let initials = "";
  for (let i = 0; i < Math.min(2, words.length); i++) {
    initials += words[i].charAt(0).toUpperCase();
  }

  // If the name has less than two words, pad with additional letters
  if (initials.length < 2 && words[0].length > 1) {
    initials += words[0].charAt(1).toUpperCase();
  }

  return initials;
}

export function createNestedUpdatePayload(
  fieldPath: string,
  value: any
): object {
  const keys = fieldPath.split(".");
  return keys.reduceRight((acc, key) => ({ [key]: acc }), value);
}

export function truncateText(
  text: any,
  maxLength: number,
  ellipsis: string = "..."
): any {
  if (typeof text !== "string") return text; // Return non-string values as is
  if (!text) return text; // Handle null, undefined, or empty strings
  if (text.length <= maxLength) return text; // No truncation needed
  const truncationLength = maxLength - ellipsis.length;
  return text.slice(0, truncationLength) + ellipsis;
}

export function extractFileName(url: string) {
  try {
    // Create a URL object and extract the pathname
    const pathname = new URL(url).pathname;
    // Get the last segment of the path and decode any URL encoded characters
    const fileWithExtension = decodeURIComponent(pathname.split("/").pop());
    // Remove the '.pdf' extension if it exists
    return fileWithExtension.replace(/\.pdf$/, "");
  } catch (error) {
    console.error("Invalid URL:", error);
    return null;
  }
}

export function trimUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.origin + u.pathname.replace(/\/+$/, ""); // remove trailing slash if needed
  } catch {
    // fallback: if it's not a valid URL, just strip manually
    return url.split(/[?#]/)[0].replace(/\/+$/, "");
  }
}
