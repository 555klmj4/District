"use client";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";
import { useTranslation, type TranslationKey } from "@/lib/i18n";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  titleKey: TranslationKey;
}

export function PageShell({ children, className, titleKey }: PageShellProps) {
  const { t, lang, setLang } = useTranslation();

  const toggleLang = () => setLang(lang === "en" ? "zh-TW" : "en");

  return (
    <div className="flex flex-col min-h-dvh">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border shadow-sm px-4 h-14 flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight">{t(titleKey)}</h1>
        <button
          onClick={toggleLang}
          className="text-xs font-medium px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
        >
          {lang === "en" ? "繁" : "EN"}
        </button>
      </header>
      <main className={cn("flex-1 pb-20 pt-2", className)}>{children}</main>
      <BottomNav />
    </div>
  );
}
