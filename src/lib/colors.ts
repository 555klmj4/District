export const TAG_COLORS = [
  { id: "green",  hex: "#22c55e", light: "#dcfce7" },
  { id: "blue",   hex: "#3b82f6", light: "#dbeafe" },
  { id: "purple", hex: "#a855f7", light: "#f3e8ff" },
  { id: "yellow", hex: "#eab308", light: "#fef9c3" },
  { id: "orange", hex: "#f97316", light: "#ffedd5" },
  { id: "red",    hex: "#ef4444", light: "#fee2e2" },
  { id: "grey",   hex: "#9ca3af", light: "#f3f4f6" },
] as const;

export type TagColor = (typeof TAG_COLORS)[number]["id"];

export const TAG_COLOR_IDS = TAG_COLORS.map((c) => c.id) as [TagColor, ...TagColor[]];

export function colorHex(id: string): string {
  return TAG_COLORS.find((c) => c.id === id)?.hex ?? "#9ca3af";
}

export function colorLight(id: string): string {
  return TAG_COLORS.find((c) => c.id === id)?.light ?? "transparent";
}

export const NO_COLOR_ID = "none";

export function sortColorTags<T extends string>(colors: T[]): T[] {
  return [...colors].sort(
    (a, b) => TAG_COLOR_IDS.indexOf(a as TagColor) - TAG_COLOR_IDS.indexOf(b as TagColor)
  );
}
