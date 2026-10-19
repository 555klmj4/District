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

export function brandSearchQueries(name: string, nameZh?: string | null): string[] {
  const parts = [name, nameZh]
    .filter((n): n is string => !!n)
    .flatMap(brandParts);
  return [...new Set(parts)].slice(0, 3);
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

export function isSameBrand(candidate: Named, base: Named): boolean {
  const baseCores = cores(base);
  return cores(candidate).some((c) => baseCores.some((b) => coresMatch(c, b)));
}
