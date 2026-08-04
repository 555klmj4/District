const CJK_RE = /[一-鿿㐀-䶿]/;

export const hasChinese = (s: string | null | undefined): boolean =>
  s != null && CJK_RE.test(s);

export function bilingualName(name: string, name_zh: string | null | undefined): string {
  if (!hasChinese(name_zh) || name_zh === name) return name;
  return `${name} (${name_zh})`;
}
