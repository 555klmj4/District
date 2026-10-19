export type Region = "HK Island" | "Kowloon" | "N.T.";

// One row per neighbourhood so its Chinese name and region can't drift apart.
const DISTRICTS: Record<string, { zh: string; region: Region }> = {
  // Hong Kong Island
  "Central":         { zh: "中環", region: "HK Island" },
  "Sheung Wan":      { zh: "上環", region: "HK Island" },
  "Sai Ying Pun":    { zh: "西營盤", region: "HK Island" },
  "Sai Wan":         { zh: "西環", region: "HK Island" },
  "Western District":{ zh: "西區", region: "HK Island" },
  "Shek Tong Tsui":  { zh: "石塘咀", region: "HK Island" },
  "Kennedy Town":    { zh: "堅尼地城", region: "HK Island" },
  "Admiralty":       { zh: "金鐘", region: "HK Island" },
  "Wan Chai":        { zh: "灣仔", region: "HK Island" },
  "Causeway Bay":    { zh: "銅鑼灣", region: "HK Island" },
  "Happy Valley":    { zh: "跑馬地", region: "HK Island" },
  "North Point":     { zh: "北角", region: "HK Island" },
  "Quarry Bay":      { zh: "鰂魚涌", region: "HK Island" },
  "Tai Koo":         { zh: "太古", region: "HK Island" },
  "Sai Wan Ho":      { zh: "西灣河", region: "HK Island" },
  "Shau Kei Wan":    { zh: "筲箕灣", region: "HK Island" },
  "Chai Wan":        { zh: "柴灣", region: "HK Island" },
  "Aberdeen":        { zh: "香港仔", region: "HK Island" },
  "Ap Lei Chau":     { zh: "鴨脷洲", region: "HK Island" },
  "Stanley":         { zh: "赤柱", region: "HK Island" },
  "Repulse Bay":     { zh: "淺水灣", region: "HK Island" },
  "Pok Fu Lam":      { zh: "薄扶林", region: "HK Island" },
  "Mid-Levels":      { zh: "半山", region: "HK Island" },
  "The Peak":        { zh: "山頂", region: "HK Island" },
  "Tai Hang":        { zh: "大坑", region: "HK Island" },
  "Tin Hau":         { zh: "天后", region: "HK Island" },
  "Fortress Hill":   { zh: "炮台山", region: "HK Island" },
  "Siu Sai Wan":     { zh: "小西灣", region: "HK Island" },
  "Tai Ping Shan":   { zh: "太平山", region: "HK Island" },
  "Aldrich Bay":     { zh: "愛秩序灣", region: "HK Island" },

  // Kowloon
  "Tsim Sha Tsui":   { zh: "尖沙咀", region: "Kowloon" },
  "Yau Ma Tei":      { zh: "油麻地", region: "Kowloon" },
  "Mong Kok":        { zh: "旺角", region: "Kowloon" },
  "Jordan":          { zh: "佐敦", region: "Kowloon" },
  "Prince Edward":   { zh: "太子", region: "Kowloon" },
  "Sham Shui Po":    { zh: "深水埗", region: "Kowloon" },
  "Cheung Sha Wan":  { zh: "長沙灣", region: "Kowloon" },
  "Lai Chi Kok":     { zh: "荔枝角", region: "Kowloon" },
  "Kowloon City":    { zh: "九龍城", region: "Kowloon" },
  "To Kwa Wan":      { zh: "土瓜灣", region: "Kowloon" },
  "Hung Hom":        { zh: "紅磡", region: "Kowloon" },
  "Ho Man Tin":      { zh: "何文田", region: "Kowloon" },
  "Kwun Tong":       { zh: "觀塘", region: "Kowloon" },
  "Lam Tin":         { zh: "藍田", region: "Kowloon" },
  "Yau Tong":        { zh: "油塘", region: "Kowloon" },
  "Tseung Kwan O":   { zh: "將軍澳", region: "Kowloon" },
  "Tung Tau":        { zh: "東頭", region: "Kowloon" },
  "Wong Tai Sin":    { zh: "黃大仙", region: "Kowloon" },
  "Diamond Hill":    { zh: "鑽石山", region: "Kowloon" },
  "Choi Hung":       { zh: "彩虹", region: "Kowloon" },
  "Kowloon Bay":     { zh: "九龍灣", region: "Kowloon" },
  "Ngau Tau Kok":    { zh: "牛頭角", region: "Kowloon" },
  "Ngau Chi Wan":    { zh: "牛池灣", region: "Kowloon" },

  // New Territories
  "Tsuen Wan":       { zh: "荃灣", region: "N.T." },
  "Kwai Chung":      { zh: "葵涌", region: "N.T." },
  "Kwai Fong":       { zh: "葵芳", region: "N.T." },
  "Tsing Yi":        { zh: "青衣", region: "N.T." },
  "Sha Tin":         { zh: "沙田", region: "N.T." },
  "Ma On Shan":      { zh: "馬鞍山", region: "N.T." },
  "Tai Wai":         { zh: "大圍", region: "N.T." },
  "Fo Tan":          { zh: "火炭", region: "N.T." },
  "Tuen Mun":        { zh: "屯門", region: "N.T." },
  "Yuen Long":       { zh: "元朗", region: "N.T." },
  "Tin Shui Wai":    { zh: "天水圍", region: "N.T." },
  "Fanling":         { zh: "粉嶺", region: "N.T." },
  "Sheung Shui":     { zh: "上水", region: "N.T." },
  "Tai Po":          { zh: "大埔", region: "N.T." },
  "Sai Kung":        { zh: "西貢", region: "N.T." },
  "Tung Chung":      { zh: "東涌", region: "N.T." },
  "Ma Wan":          { zh: "馬灣", region: "N.T." },
  "Clearwater Bay":  { zh: "清水灣", region: "N.T." },
  "Hang Hau":        { zh: "坑口", region: "N.T." },
  "Po Lam":          { zh: "寶琳", region: "N.T." },
  "Shuen Wan":       { zh: "船灣", region: "N.T." },
};

export function districtZh(englishDistrict: string | null | undefined): string | null {
  if (!englishDistrict) return null;
  return DISTRICTS[englishDistrict]?.zh ?? null;
}

// Section headers only have the English district key; when it isn't in the
// static map, fall back to the Chinese district Google gave any restaurant in it.
export function districtLabelZh(
  englishDistrict: string,
  restaurants: { district_zh?: string | null }[]
): string {
  return (
    districtZh(englishDistrict) ??
    restaurants.find((r) => r.district_zh && /[一-鿿]/.test(r.district_zh))?.district_zh ??
    englishDistrict
  );
}

const DISTRICT_ZH_TO_EN: Record<string, string> = Object.fromEntries(
  Object.entries(DISTRICTS).map(([en, { zh }]) => [zh, en])
);

export function districtEn(chineseDistrict: string | null | undefined): string | null {
  if (!chineseDistrict) return null;
  return DISTRICT_ZH_TO_EN[chineseDistrict] ?? null;
}

export const REGIONS: Region[] = ["HK Island", "Kowloon", "N.T."];
export const REGION_ZH: Record<Region, string> = {
  "HK Island": "港島",
  "Kowloon":   "九龍",
  "N.T.":      "新界",
};

export const REGION_COLORS: Record<Region, { bg: string; text: string; active: string }> = {
  "HK Island": { bg: "bg-[var(--region-hk-island)]", text: "text-blue-800",  active: "bg-blue-600 text-white border-blue-600" },
  "Kowloon":   { bg: "bg-[var(--region-kowloon)]",   text: "text-red-800",   active: "bg-red-600 text-white border-red-600" },
  "N.T.":      { bg: "bg-[var(--region-nt)]",        text: "text-green-800", active: "bg-green-600 text-white border-green-600" },
};

export function districtToRegion(district: string | null | undefined): Region | null {
  if (!district) return null;
  return DISTRICTS[district]?.region ?? null;
}
