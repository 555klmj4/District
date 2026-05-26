import "server-only";
import type { WeeklyHours, DayHours } from "@/shared/types/restaurant";

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
type DayKey = (typeof DAY_NAMES)[number];

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isOpenNow(hours: WeeklyHours, now: Date = new Date()): boolean {
  const dayKey = DAY_NAMES[now.getDay()] as DayKey;
  const dayHours = hours[dayKey];

  if (!dayHours || dayHours.closed) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = parseTime(dayHours.open);
  const closeMinutes = parseTime(dayHours.close);

  if (closeMinutes < openMinutes) {
    // Crosses midnight (e.g. 22:00 – 02:00)
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function formatOpenStatus(
  hours: WeeklyHours | null,
  now: Date = new Date()
): { open: boolean; label: string } {
  if (!hours) return { open: false, label: "Hours unknown" };

  const dayKey = DAY_NAMES[now.getDay()] as DayKey;
  const dayHours = hours[dayKey];

  if (!dayHours || dayHours.closed) {
    return { open: false, label: "Closed today" };
  }

  const open = isOpenNow(hours, now);
  if (open) {
    return { open: true, label: `Open until ${formatHour(dayHours.close)}` };
  }

  const openMin = parseTime(dayHours.open);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (nowMin < openMin) {
    return { open: false, label: `Opens at ${formatHour(dayHours.open)}` };
  }
  return { open: false, label: `Closed (opens ${formatHour(dayHours.open)})` };
}

function formatHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const hour = h ?? 0;
  const min = m ?? 0;
  const period = hour < 12 ? "am" : "pm";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return min === 0 ? `${h12}${period}` : `${h12}:${String(min).padStart(2, "0")}${period}`;
}
