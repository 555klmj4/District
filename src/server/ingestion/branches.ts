import "server-only";

const CJK_RE = /[一-鿿㐀-䶿]/;
const CJK_RUN_RE = /[一-鿿㐀-䶿]+/g;
const TRAILING_PAREN_RE = /\s*[(（][^()（）]*[)）]\s*$/;
const TRAILING_DASH_RE = /\s+[-–—]\s+.*$/;
const TRAILING_COMMA_RE = /\s*[,，]\s*[^,，]*$/;

// Strips a trailing branch qualifier, e.g. "Tim Ho Wan (Sham Shui Po)",
// "Mak's Noodle - Jordan", "添好運（旺角店）" → the bare brand name.
export function brandQuery(name: string): string {
  let current = name.trim();
  for (;;) {
    const next = current
      .replace(TRAILING_PAREN_RE, "")
      .replace(TRAILING_DASH_RE, "")
      .replace(TRAILING_COMMA_RE, "")
      .trim();
    if (next === current || next === "") break;
    current = next;
  }
  return current;
}

export function brandCore(name: string): string {
  return brandQuery(name).toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

// HK shops often carry both names in one, e.g. "A Little Treat 小甜頭".
// Returns the whole brand plus its Latin-only and Chinese-only parts.
function brandParts(name: string): string[] {
  const brand = brandQuery(name);
  if (!CJK_RE.test(brand)) return [brand];
  const zh = (brand.match(CJK_RUN_RE) ?? []).join("");
  const latin = brand.replace(CJK_RUN_RE, " ").replace(/\s+/g, " ").trim();
  return [brand, latin, zh].filter((p) => brandCore(p).length > 0);
}

const LEADING_ARTICLES = new Set(["a", "an", "the", "la", "le", "el", "il", "lo", "los", "las", "les"]);

// Words too common to identify a chain on their own ("The Coffee Club" and
// "The Coffee Academics" aren't one brand).
const GENERIC_WORDS = new Set([
  "bar", "bakery", "bistro", "burger", "burgers", "cafe", "café", "coffee", "dessert",
  "desserts", "dining", "grill", "house", "kitchen", "little", "noodle", "noodles",
  "pizza", "pizzeria", "ramen", "restaurant", "steak", "steakhouse", "sushi", "tea",
]);

function latinWords(name: string): string[] {
  return brandQuery(name)
    .replace(CJK_RUN_RE, " ")
    .split(/\s+/)
    .filter(Boolean);
}

// The leading articles plus the first distinctive word, e.g.
// "La Parrilla Argentinian Steak House" → "La Parrilla". Null when the first
// real word is generic or too short to tell chains apart.
function brandHead(name: string): string | null {
  const words = latinWords(name);
  const i = words.findIndex((w) => !LEADING_ARTICLES.has(w.toLowerCase()));
  if (i < 0 || i === words.length - 1) return null;
  const key = words[i]!.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  if (key.length < 5 || GENERIC_WORDS.has(key)) return null;
  return words.slice(0, i + 1).join(" ");
}

export function brandSearchQueries(name: string, nameZh?: string | null): string[] {
  const names = [name, nameZh].filter((n): n is string => !!n);
  const parts = names.flatMap((n) => {
    const all = brandParts(n);
    // A mixed name is covered by its separate Latin and Chinese parts.
    return all.length > 1 ? all.slice(1) : all;
  });
  const heads = names.map(brandHead).filter((h): h is string => h != null);
  return [...new Set([...parts, ...heads])].slice(0, 3);
}

function coresMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  const minLength = CJK_RE.test(short) ? 2 : 3;
  return short.length >= minLength && long.startsWith(short);
}

interface Named {
  name: string;
  name_zh?: string | null;
}

function cores(n: Named): string[] {
  return [n.name, n.name_zh]
    .filter((x): x is string => !!x)
    .flatMap(brandParts)
    .map(brandCore);
}

function heads(n: Named): string[] {
  return [n.name, n.name_zh]
    .filter((x): x is string => !!x)
    .map(brandHead)
    .filter((h): h is string => h != null)
    .map(brandCore);
}

export function isSameBrand(candidate: Named, base: Named): boolean {
  const baseCores = cores(base);
  if (cores(candidate).some((c) => baseCores.some((b) => coresMatch(c, b)))) return true;
  // Same distinctive opening, e.g. "La Parrilla Steakhouse" vs
  // "La Parrilla Argentinian Steak House".
  const baseHeads = heads(base);
  return heads(candidate).some((h) => baseHeads.includes(h));
}
