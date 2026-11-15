import type { Trip } from "./model";

// UTC calendar arithmetic avoids machine time zones and daylight-saving changes.
export function previousDay(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(d.getTime())) return value;
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
export const januaryDate = (t: Trip, value: string) =>
  t.january2027Shift === 1 ? previousDay(value) : value;
