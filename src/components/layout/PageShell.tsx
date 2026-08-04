"use client";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, LocateFixed, Locate, Loader2, History } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { useLocation } from "@/client/hooks/useLocation";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export function PageShell({ children, className }: PageShellProps) {
  const { t, lang, setLang } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const location = useLocation();
  const onHistoryPage = pathname === "/history";

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const toggleLang = () => setLang(lang === "en" ? "zh-TW" : "en");

  async function handleLogout() {
    setIsLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col min-h-dvh">
      <header className="sticky top-0 z-40 bg-white/60 backdrop-blur-2xl backdrop-saturate-150 border-b border-white/50 px-4 min-h-11 pt-safe flex items-center justify-between">
        <h1 className="flex items-center gap-1.5 text-base font-bold tracking-tight">
          {t("app_title")}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLang}
            className="text-xs font-medium px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            {lang === "en" ? "繁" : "EN"}
          </button>
          <button
            onClick={() => router.push(onHistoryPage ? "/discover" : "/history")}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label={onHistoryPage ? t("nav_discover") : t("nav_history")}
          >
            <History className="h-4 w-4" />
          </button>
          <button
            onClick={() => location.granted === true ? location.clear() : location.request()}
            disabled={location.loading}
            className={cn(
              "transition-colors p-1",
              location.granted === true
                ? "text-primary hover:text-primary/70"
                : location.granted === false
                ? "text-destructive hover:text-destructive/70"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-label={location.granted === true ? "Disable location" : "Enable location"}
          >
            {location.loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : location.granted === true
              ? <LocateFixed className="h-4 w-4" />
              : <Locate className="h-4 w-4" />}
          </button>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 disabled:opacity-50"
            aria-label="Log out"
          >
            {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          </button>
        </div>
      </header>
      <main className={cn("flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-2", className)}>{children}</main>
      <BottomNav />
    </div>
  );
}
