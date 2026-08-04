const DISTRICT_ZH: Record<string, string> = {
  // Hong Kong Island
  "Central":           "中環",
  "Sheung Wan":        "上環",
  "Sai Ying Pun":      "西營盤",
  "Sai Wan":           "西環",
  "Western District":  "西區",
  "Shek Tong Tsui":   "石塘咀",
  "Kennedy Town":      "堅尼地城",
  "Admiralty":         "金鐘",
  "Wan Chai":          "灣仔",
  "Causeway Bay":      "銅鑼灣",
  "Happy Valley":      "跑馬地",
  "North Point":       "北角",
  "Quarry Bay":        "鰂魚涌",
  "Tai Koo":           "太古",
  "Sai Wan Ho":        "西灣河",
  "Shau Kei Wan":      "筲箕灣",
  "Chai Wan":          "柴灣",
  "Aberdeen":          "香港仔",
  "Ap Lei Chau":       "鴨脷洲",
  "Stanley":           "赤柱",
  "Repulse Bay":       "淺水灣",
  "Pok Fu Lam":        "薄扶林",
  "Mid-Levels":        "半山",
  "The Peak":          "山頂",
  "Tai Hang":          "大坑",
  "Tin Hau":           "天后",
  "Fortress Hill":     "炮台山",
  "Siu Sai Wan":       "小西灣",

  // Kowloon
  "Tsim Sha Tsui":     "尖沙咀",
  "Yau Ma Tei":        "油麻地",
  "Mong Kok":          "旺角",
  "Jordan":            "佐敦",
  "Prince Edward":     "太子",
  "Sham Shui Po":      "深水埗",
  "Cheung Sha Wan":    "長沙灣",
  "Lai Chi Kok":       "荔枝角",
  "Kowloon City":      "九龍城",
  "To Kwa Wan":        "土瓜灣",
  "Hung Hom":          "紅磡",
  "Ho Man Tin":        "何文田",
  "Kwun Tong":         "觀塘",
  "Lam Tin":           "藍田",
  "Yau Tong":          "油塘",
  "Tseung Kwan O":     "將軍澳",
  "Tung Tau":          "東頭",
  "Wong Tai Sin":      "黃大仙",
  "Diamond Hill":      "鑽石山",
  "Choi Hung":         "彩虹",
  "Kowloon Bay":       "九龍灣",
  "Ngau Tau Kok":      "牛頭角",
  "Ngau Chi Wan":      "牛池灣",

  // New Territories
  "Tsuen Wan":         "荃灣",
  "Kwai Chung":        "葵涌",
  "Kwai Fong":         "葵芳",
  "Tsing Yi":          "青衣",
  "Sha Tin":           "沙田",
  "Ma On Shan":        "馬鞍山",
  "Tai Wai":           "大圍",
  "Fo Tan":            "火炭",
  "Tuen Mun":          "屯門",
  "Yuen Long":         "元朗",
  "Tin Shui Wai":      "天水圍",
  "Fanling":           "粉嶺",
  "Sheung Shui":       "上水",
  "Tai Po":            "大埔",
  "Sai Kung":          "西貢",
  "Tung Chung":        "東涌",
  "Ma Wan":            "馬灣",
  "Clearwater Bay":    "清水灣",
  "Hang Hau":          "坑口",
  "Po Lam":            "寶琳",
  "Shuen Wan":         "船灣",
};

export function districtZh(englishDistrict: string | null | undefined): string | null {
  if (!englishDistrict) return null;
  return DISTRICT_ZH[englishDistrict] ?? null;
}

const DISTRICT_ZH_TO_EN: Record<string, string> = Object.fromEntries(
  Object.entries(DISTRICT_ZH).map(([en, zh]) => [zh, en])
);

export function districtEn(chineseDistrict: string | null | undefined): string | null {
  if (!chineseDistrict) return null;
  return DISTRICT_ZH_TO_EN[chineseDistrict] ?? null;
}

const HK_ISLAND_DISTRICTS = new Set([
  "Central", "Sheung Wan", "Sai Ying Pun", "Sai Wan", "Western District",
  "Shek Tong Tsui", "Kennedy Town", "Admiralty", "Wan Chai", "Causeway Bay",
  "Happy Valley", "North Point", "Quarry Bay", "Tai Koo", "Sai Wan Ho",
  "Shau Kei Wan", "Chai Wan", "Aberdeen", "Ap Lei Chau", "Stanley",
  "Repulse Bay", "Pok Fu Lam", "Mid-Levels", "The Peak", "Tai Hang",
  "Tin Hau", "Fortress Hill", "Siu Sai Wan",
]);

const KOWLOON_DISTRICTS = new Set([
  "Tsim Sha Tsui", "Yau Ma Tei", "Mong Kok", "Jordan", "Prince Edward",
  "Sham Shui Po", "Cheung Sha Wan", "Lai Chi Kok", "Kowloon City",
  "To Kwa Wan", "Hung Hom", "Ho Man Tin", "Kwun Tong", "Lam Tin",
  "Yau Tong", "Tseung Kwan O", "Tung Tau", "Wong Tai Sin", "Diamond Hill",
  "Choi Hung", "Kowloon Bay", "Ngau Tau Kok", "Ngau Chi Wan",
]);

const NT_DISTRICTS = new Set([
  "Tsuen Wan", "Kwai Chung", "Kwai Fong", "Tsing Yi", "Sha Tin",
  "Ma On Shan", "Tai Wai", "Fo Tan", "Tuen Mun", "Yuen Long",
  "Tin Shui Wai", "Fanling", "Sheung Shui", "Tai Po", "Sai Kung",
  "Tung Chung", "Ma Wan", "Clearwater Bay", "Hang Hau", "Po Lam", "Shuen Wan",
]);

export type Region = "HK Island" | "Kowloon" | "N.T.";
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
  if (HK_ISLAND_DISTRICTS.has(district)) return "HK Island";
  if (KOWLOON_DISTRICTS.has(district))   return "Kowloon";
  if (NT_DISTRICTS.has(district))        return "N.T.";
  return null;
}
