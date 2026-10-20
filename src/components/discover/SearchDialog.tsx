"use client";
import { useState, type ReactElement } from "react";
import Link from "next/link";
import { Search, Star, X } from "lucide-react";
import { STAR_COLOR_CLASS } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { districtZh } from "@/lib/district-zh";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/client/trpc";
import { hasChinese, bilingualName } from "@/lib/restaurant-name";

// Stacks the floating search button directly above the filter button
// (GlassCircleButton: 1rem from the bottom, 3.5rem tall) with a 0.75rem gap.
export const SEARCH_BUTTON_BOTTOM = "calc(5.25rem + env(safe-area-inset-bottom, 0px))";

interface SearchDialogProps {
  value: string;
  onSubmit: (search: string) => void;
  renderTrigger: ReactElement;
}

export function SearchDialog({ value, onSubmit, renderTrigger }: SearchDialogProps) {
  const { t, lang } = useTranslation();
  const zh = lang === "zh-TW";

  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState(value);

  const debouncedDraft = useDebouncedValue(searchDraft, 300);
  const trimmedDraft = debouncedDraft.trim();
  const preview = trpc.restaurants.search.useQuery(
    { query: trimmedDraft },
    { enabled: trimmedDraft.length >= 2 }
  );

  function submitSearch() {
    onSubmit(searchDraft.trim());
    setSearchDialogOpen(false);
  }

  return (
      <Dialog
        open={searchDialogOpen}
        onOpenChange={(o) => {
          setSearchDialogOpen(o);
          if (o) setSearchDraft(value);
        }}
      >
        <DialogTrigger render={renderTrigger}>
          <Search className="w-5 h-5" />
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("search_title")}</DialogTitle>
          </DialogHeader>
          <form
            className="flex gap-2 pt-2"
            onSubmit={(e) => { e.preventDefault(); submitSearch(); }}
          >
            <div className="relative flex-1">
              <Input
                placeholder={t("search_placeholder")}
                className={searchDraft ? "pr-8" : undefined}
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                autoFocus
              />
              {searchDraft && (
                <button
                  type="button"
                  onClick={() => setSearchDraft("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              {trimmedDraft.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-xl border border-white/50 bg-[oklch(0.97_0.006_48)] shadow-[0_8px_32px_oklch(0_0_0/0.14),0_1px_0_oklch(1_0_0/0.6)_inset,0_-1px_0_oklch(0_0_0/0.04)_inset] divide-y divide-white/40 z-50">
                  {preview.isFetching ? (
                    <div className="space-y-2 p-2">
                      <Skeleton className="h-12 rounded-md" />
                      <Skeleton className="h-12 rounded-md" />
                      <Skeleton className="h-12 rounded-md" />
                    </div>
                  ) : preview.isError ? (
                    <p className="p-3 text-sm text-destructive">{t("search_error")}</p>
                  ) : preview.data && preview.data.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">{t("search_no_results")}</p>
                  ) : (
                    preview.data?.map((r) => {
                      const displayName = bilingualName(r.name, r.name_zh);
                      const displayDistrict = zh
                        ? (hasChinese(r.district_zh) ? r.district_zh! : districtZh(r.district) ?? r.district)
                        : r.district;
                      const rating = r.rating_aggregate != null ? parseFloat(r.rating_aggregate).toFixed(1) : null;
                      return (
                        <Link
                          key={r.id}
                          href={`/restaurants/${r.id}`}
                          className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-white/40"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{displayName}</span>
                            {displayDistrict && (
                              <span className="block truncate text-xs text-muted-foreground">{displayDistrict}</span>
                            )}
                          </span>
                          {rating != null && (
                            <span className="mt-0.5 flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
                              <Star className={cn("w-3 h-3 fill-current", STAR_COLOR_CLASS)} />
                              {rating}
                            </span>
                          )}
                        </Link>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            <Button type="submit">{t("search_title")}</Button>
          </form>
        </DialogContent>
      </Dialog>
  );
}
