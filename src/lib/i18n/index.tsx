"use client";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { en, zhTW } from "./translations";

export type Language = "en" | "zh-TW";
export type TranslationKey = keyof typeof en;

const translations: Record<Language, Record<string, string>> = { en, "zh-TW": zhTW };

type I18nContextValue = {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue>({
  lang: "en",
  setLang: () => {},
  t: (k) => en[k],
});

function getInitialLang(): Language {
  if (typeof window === "undefined") return "en";
  return (localStorage.getItem("district-lang") as Language) ?? "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(getInitialLang);

  const setLang = useCallback((l: Language) => {
    localStorage.setItem("district-lang", l);
    setLangState(l);
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translations[lang][key] ?? en[key],
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
