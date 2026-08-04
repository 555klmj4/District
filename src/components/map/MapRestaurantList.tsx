"use client";
import { useEffect, useMemo, useRef } from "react";
import { UtensilsCrossed } from "lucide-react";
import { RestaurantCard } from "@/components/restaurant/RestaurantCard";
import { useTranslation } from "@/lib/i18n";
import { districtToRegion, districtZh, REGION_COLORS } from "@/lib/district-zh";
import { cn } from "@/lib/utils";
import type { Restaurant } from "@/shared/types/restaurant";

interface MapRestaurantListProps {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function MapRestaurantList({ restaurants, selectedId, onSelect }: MapRestaurantListProps) {
  const { t, lang } = useTranslation();
  const zh = lang === "zh-TW";
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!selectedId) return;
    itemRefs.current.get(selectedId)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  const groupedRestaurants = useMemo(() => {
    const groups = new Map<string, Restaurant[]>();
    for (const r of restaurants) {
      const key = r.district ?? "Other";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [restaurants]);

  if (restaurants.length === 0) {
    return (
      <div className="h-full overflow-y-auto flex flex-col items-center justify-center py-10 text-muted-foreground">
        <div className="w-12 h-12 rounded-full bg-primary/8 flex items-center justify-center mb-3">
          <UtensilsCrossed className="w-6 h-6 text-primary/60" />
        </div>
        <p className="font-medium text-foreground">{t("no_restaurants_title")}</p>
        <p className="text-sm mt-1">{t("no_restaurants_body")}</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
      {groupedRestaurants.map(([district, items]) => {
        const region = districtToRegion(district);
        const textClass = region ? REGION_COLORS[region].text : "text-foreground";
        return (
          <div key={district}>
            <div className="sticky top-0 z-10 px-4 pt-2 pb-1 flex items-center gap-2 border-b border-border bg-background">
              <span className={cn("text-xs uppercase tracking-wider font-semibold", textClass)}>
                {zh ? (districtZh(district) ?? district) : district}
              </span>
              <span className="text-xs text-muted-foreground/50">{items.length}</span>
            </div>
            <div className="divide-y divide-border">
              {items.map((r) => (
                <div
                  key={r.id}
                  ref={(el) => {
                    if (el) itemRefs.current.set(r.id, el);
                    else itemRefs.current.delete(r.id);
                  }}
                >
                  <RestaurantCard restaurant={r} isSelected={selectedId === r.id} onSelect={onSelect} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
