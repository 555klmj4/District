"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, Sparkles, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const NAV_ITEMS = [
    { href: "/discover",   labelKey: "nav_discover" as const, icon: List },
    { href: "/recommend",  labelKey: "nav_ai_pick"  as const, icon: Sparkles },
    { href: "/map",        labelKey: "nav_map"      as const, icon: Map },
  ];

  return (
    <nav
      className="fixed inset-x-0 z-50 flex justify-center px-6 pointer-events-none"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div
        className={cn(
          "flex items-center gap-1 p-1.5 rounded-full pointer-events-auto",
          "bg-white/35 backdrop-blur-2xl backdrop-saturate-150",
          "border border-white/50",
          "shadow-[0_8px_32px_oklch(0_0_0/0.14),0_1px_0_oklch(1_0_0/0.6)_inset,0_-1px_0_oklch(0_0_0/0.04)_inset]"
        )}
      >
        {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const label = t(labelKey);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={cn(
                "flex items-center justify-center w-14 h-11 rounded-full transition-all",
                active
                  ? "bg-white/70 shadow-[0_1px_2px_oklch(0_0_0/0.08),0_1px_0_oklch(1_0_0/0.8)_inset] text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/25"
              )}
            >
              <Icon
                className={cn("w-5 h-5 transition-transform", active && "scale-105")}
                strokeWidth={active ? 2.25 : 1.75}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
