export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** ISO-8601 in UTC without a needless ".000" (matches the spec's `2026-12-10T09:00:00Z`). */
export function toIso(date: Date): string {
  return date.toISOString().replace(".000Z", "Z");
}

// Display timezone for the web page only; the API always speaks UTC.
const CLINIC_TIMEZONE = "Africa/Lagos";

export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: CLINIC_TIMEZONE,
  }).format(new Date(iso));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: CLINIC_TIMEZONE,
  }).format(new Date(iso));
}
