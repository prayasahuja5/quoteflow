const KOLKATA = "Asia/Kolkata";

export function todayInKolkata(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KOLKATA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isExpired(validUntil: string | null, now = new Date()): boolean {
  if (!validUntil) return false;
  return validUntil < todayInKolkata(now);
}

export function startOfMonthKolkata(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: KOLKATA,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (!year || !month) {
    throw new Error("Could not resolve the current month in Asia/Kolkata.");
  }
  return new Date(`${year}-${month}-01T00:00:00+05:30`);
}

export function formatDisplayDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: KOLKATA,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
