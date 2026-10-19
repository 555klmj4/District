"use client";
import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/client/trpc";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { bilingualName } from "@/lib/restaurant-name";
import {
  REGIONS,
  REGION_COLORS,
  REGION_ZH,
  districtToRegion,
  districtZh,
  type Region,
} from "@/lib/district-zh";

interface BranchSuggestionsProps {
  restaurantId: string;
  restaurantName: string;
  onDone: () => void;
  // Called instead of onDone when there is nothing to show; defaults to onDone.
  onEmpty?: (reason: "none" | "error") => void;
}

export function BranchSuggestions({ restaurantId, restaurantName, onDone, onEmpty }: BranchSuggestionsProps) {
  const { lang, t } = useTranslation();
  const zh = lang === "zh-TW";
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const doneRef = useRef(false);

  const branches = trpc.ingestion.findBranches.useQuery(
    { restaurantId },
    { retry: false, refetchOnWindowFocus: false }
  );

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  };

  const emptyReason = branches.isError
    ? "error"
    : branches.isSuccess && branches.data.length === 0
      ? "none"
      : null;
  useEffect(() => {
    if (emptyReason && !doneRef.current) {
      doneRef.current = true;
      if (onEmpty) onEmpty(emptyReason);
      else onDone();
    }
  }, [emptyReason, onDone, onEmpty]);

  const importBranches = trpc.ingestion.importBranches.useMutation({
    onSuccess: ({ added, duplicates, failed }) => {
      let message = `${t("branches_added")} ${added}`;
      if (duplicates > 0) message += ` · ${duplicates} ${t("branches_already_saved")}`;
      if (failed > 0) message += ` · ${failed} ${t("branches_failed")}`;
      if (added > 0) toast.success(message);
      else toast.error(message);
      finish();
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to add branches");
    },
  });

  if (!branches.data || branches.data.length === 0) {
    return (
      <div className="space-y-3 pt-2">
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("branches_checking")}
        </p>
        <div className="space-y-2">
          <Skeleton className="h-12 rounded-md" />
          <Skeleton className="h-12 rounded-md" />
          <Skeleton className="h-12 rounded-md" />
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" onClick={finish}>
            {t("branches_skip")}
          </Button>
        </div>
      </div>
    );
  }

  const items = branches.data;
  const groups = new Map<Region | null, typeof items>();
  for (const region of [...REGIONS, null]) groups.set(region, []);
  for (const b of items) groups.get(districtToRegion(b.district))!.push(b);

  const allSelected = selected.size === items.length;
  const toggle = (placeId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  const isPending = importBranches.isPending;

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium min-w-0 truncate">
          {t("branches_title")} {restaurantName}
        </p>
        <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="accent-primary"
            checked={allSelected}
            disabled={isPending}
            onChange={() =>
              setSelected(allSelected ? new Set() : new Set(items.map((b) => b.placeId)))
            }
          />
          {t("branches_select_all")}
        </label>
      </div>

      <div className="max-h-80 overflow-y-auto space-y-3 -mx-1 px-1">
        {[...groups.entries()]
          .filter(([, list]) => list.length > 0)
          .map(([region, list]) => (
            <div key={region ?? "other"} className="space-y-1">
              <span
                className={cn(
                  "inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  region ? cn(REGION_COLORS[region].bg, REGION_COLORS[region].text) : "bg-muted text-muted-foreground"
                )}
              >
                {region ? (zh ? REGION_ZH[region] : region) : t("branches_region_other")}
              </span>
              {list.map((b) => (
                <label
                  key={b.placeId}
                  className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 hover:bg-muted/60"
                >
                  <input
                    type="checkbox"
                    className="accent-primary mt-1"
                    checked={selected.has(b.placeId)}
                    disabled={isPending}
                    onChange={() => toggle(b.placeId)}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {bilingualName(b.name, b.name_zh)}
                    </span>
                    <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      {b.district && (
                        <>
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="shrink-0">{zh ? districtZh(b.district) ?? b.district : b.district}</span>
                          <span className="shrink-0">·</span>
                        </>
                      )}
                      <span className="truncate">{b.address}</span>
                    </span>
                  </span>
                </label>
              ))}
            </div>
          ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={finish} disabled={isPending}>
          {t("branches_skip")}
        </Button>
        <Button
          onClick={() => importBranches.mutate({ placeIds: [...selected] })}
          disabled={selected.size === 0 || isPending}
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {t("branches_add")} ({selected.size})
        </Button>
      </div>
    </div>
  );
}
