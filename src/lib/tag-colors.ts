export const PRESET_TAGS = [
  { name: "Must Try",   bg: "#ef4444", light: "#fee2e2", text: "#991b1b" },
  { name: "Favourite",  bg: "#f97316", light: "#ffedd5", text: "#9a3412" },
  { name: "Been Here",  bg: "#22c55e", light: "#dcfce7", text: "#14532d" },
  { name: "Date Night", bg: "#8b5cf6", light: "#ede9fe", text: "#4c1d95" },
  { name: "Lunch Spot", bg: "#06b6d4", light: "#cffafe", text: "#164e63" },
  { name: "Hidden Gem", bg: "#eab308", light: "#fef9c3", text: "#713f12" },
] as const;

export type PresetTag = (typeof PRESET_TAGS)[number]["name"];

export function tagColor(tag: string) {
  const preset = PRESET_TAGS.find((p) => p.name === tag);
  if (preset) return preset;
  // Fallback for any legacy free-text tags
  return { bg: "#94a3b8", light: "#f1f5f9", text: "#475569" };
}
