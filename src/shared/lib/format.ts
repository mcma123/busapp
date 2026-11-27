export const TZ = "Africa/Johannesburg";

const dateKeyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("en-ZA", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
const timeSecFmt = new Intl.DateTimeFormat("en-ZA", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const dateFmt = new Intl.DateTimeFormat("en-ZA", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
const dayFmt = new Intl.DateTimeFormat("en-ZA", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
const longDayFmt = new Intl.DateTimeFormat("en-ZA", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
const zar = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 2 });
const num = new Intl.NumberFormat("en-ZA");

/** YYYY-MM-DD for a Date in Johannesburg time */
export function dateKey(d: Date = new Date()): string {
  return dateKeyFmt.format(d);
}
/** Noon on a date key, safe for formatting the day */
export function keyToDate(key: string): Date {
  return new Date(`${key}T12:00:00+02:00`);
}
export const fmtTime = (iso: string) => timeFmt.format(new Date(iso));
export const fmtTimeSec = (iso: string) => timeSecFmt.format(new Date(iso));
export const fmtDate = (isoOrKey: string) => dateFmt.format(isoOrKey.length === 10 ? keyToDate(isoOrKey) : new Date(isoOrKey));
export const fmtDay = (key: string) => dayFmt.format(keyToDate(key));
export const fmtLongDay = (key: string) => longDayFmt.format(keyToDate(key));
export const fmtDateTime = (iso: string) => `${fmtDate(iso)}, ${fmtTime(iso)}`;
export const fmtZAR = (n: number) => zar.format(n);
export const fmtNum = (n: number) => num.format(n);
export const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));

export const dirLabel = (d: "AM" | "PM") => (d === "AM" ? "To school" : "From school");
