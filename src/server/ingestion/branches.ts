import "server-only";

const CJK_RE = /[一-鿿㐀-䶿]/;
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

export function isSameBrand(candidate: Named, base: Named): boolean {
  const candidateCores = [candidate.name, candidate.name_zh].filter(Boolean).map((n) => brandCore(n!));
  const baseCores = [base.name, base.name_zh].filter(Boolean).map((n) => brandCore(n!));
  return candidateCores.some((c) => baseCores.some((b) => coresMatch(c, b)));
}
