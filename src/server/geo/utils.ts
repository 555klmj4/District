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

function getLocalTime(timezone?: string): { dayKey: DayKey; minutes: number } {
  const now = new Date();
  if (timezone) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        weekday: "short",
        hour: "numeric",
        minute: "numeric",
        hour12: false,
      }).formatToParts(now);
      const weekdayMap: Record<string, number> = {
        Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
      };
      const weekdayStr = parts.find((p) => p.type === "weekday")?.value ?? "";
      const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
      const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
      const dayIndex = weekdayMap[weekdayStr] ?? now.getDay();
      return {
        dayKey: DAY_NAMES[dayIndex] as DayKey,
        minutes: (hour === 24 ? 0 : hour) * 60 + minute,
      };
    } catch {
      // Fall through to UTC
    }
  }
  return {
    dayKey: DAY_NAMES[now.getDay()] as DayKey,
    minutes: now.getHours() * 60 + now.getMinutes(),
  };
}

export function isOpenNow(hours: WeeklyHours, timezone?: string): boolean {
  const { dayKey, minutes: currentMinutes } = getLocalTime(timezone);
  const dayHours = hours[dayKey];

  if (!dayHours || dayHours.closed) return false;

  const openMinutes = parseTime(dayHours.open);
  const closeMinutes = parseTime(dayHours.close);

  if (closeMinutes < openMinutes) {
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
  timezone?: string
): { open: boolean; label: string } {
  if (!hours) return { open: false, label: "Hours unknown" };

  const { dayKey, minutes: nowMin } = getLocalTime(timezone);
  const dayHours = hours[dayKey];

  if (!dayHours || dayHours.closed) {
    return { open: false, label: "Closed today" };
  }

  const open = isOpenNow(hours, timezone);
  if (open) {
    return { open: true, label: `Open until ${formatHour(dayHours.close)}` };
  }

  const openMin = parseTime(dayHours.open);
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
