"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, BookmarkIcon, Sparkles, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const NAV_ITEMS = [
    { href: "/discover", labelKey: "nav_discover" as const, icon: Compass },
    { href: "/bookmarks", labelKey: "nav_saved" as const, icon: BookmarkIcon },
    { href: "/recommend", labelKey: "nav_ai_pick" as const, icon: Sparkles },
    { href: "/map", labelKey: "nav_map" as const, icon: Map },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-card/95 backdrop-blur border-t border-border shadow-[0_-1px_4px_oklch(0_0_0/0.06)] pb-safe">
      <div className="flex items-stretch h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 text-xs transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-11 h-7 rounded-full transition-all",
                  active ? "bg-primary/10" : ""
                )}
              >
                <Icon
                  className={cn("w-5 h-5 transition-all", active && "fill-primary/20")}
                  strokeWidth={active ? 2.5 : 1.75}
                />
              </div>
              <span className={cn("font-medium", active && "font-semibold")}>{t(labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
