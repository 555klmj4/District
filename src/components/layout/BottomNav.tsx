"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, BookmarkIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/bookmarks", label: "Saved", icon: BookmarkIcon },
  { href: "/recommend", label: "AI Pick", icon: Sparkles },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-card/95 backdrop-blur border-t border-border pb-safe">
      <div className="flex items-stretch h-16 max-w-lg mx-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 text-xs transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn("w-5 h-5", active && "fill-primary/20")}
                strokeWidth={active ? 2.5 : 1.75}
              />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
