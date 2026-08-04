"use client";
import { useState, type ReactElement } from "react";
import { Plus, Link2, Search, Loader2, CheckCircle2, ClipboardPaste, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/client/trpc";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { cn } from "@/lib/utils";
import { STAR_COLOR_CLASS } from "@/lib/colors";
import { bilingualName } from "@/lib/restaurant-name";

function extractUrl(text: string): string {
  if (/^https?:\/\/\S+$/.test(text.trim())) return text.trim();
  const match = text.match(/https?:\/\/[^\s]+/);
  return match ? match[0]! : text;
}

interface ImportDialogProps {
  renderTrigger?: ReactElement;
  iconOnly?: boolean;
}

export function ImportDialog({ renderTrigger, iconOnly }: ImportDialogProps = {}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"link" | "search">("link");
  const [url, setUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const { t } = useTranslation();

  const utils = trpc.useUtils();

  const resetAndClose = (name: string, wasDuplicate: boolean) => {
    toast.success(wasDuplicate ? `Already saved: ${name}` : `Saved: ${name}`);
    setUrl("");
    setSearchQuery("");
    setSelectedPlaceId(null);
    setOpen(false);
    // Defer the list refetch/re-render to its own tick so it can't block the
    // browser from painting the dialog-closed state in the same frame — on a
    // large list this re-render is heavy enough to make the dialog appear to
    // hang for several seconds even though the mutation already resolved.
    setTimeout(() => {
      void utils.restaurants.list.invalidate();
    }, 0);
  };

  const importMutation = trpc.ingestion.importUrl.useMutation({
    onSuccess: (data) => resetAndClose(data.restaurant.name, data.was_duplicate),
    onError: (err) => {
      toast.error(err.message ?? "Failed to import restaurant");
    },
  });

  const importByPlaceIdMutation = trpc.ingestion.importByPlaceId.useMutation({
    onSuccess: (data) => resetAndClose(data.restaurant.name, data.was_duplicate),
    onError: (err) => {
      toast.error(err.message ?? "Failed to import restaurant");
      setSelectedPlaceId(null);
    },
  });

  const handleImport = () => {
    if (!url.trim()) return;
    importMutation.mutate({ url: url.trim() });
  };

  const handleSelectResult = (placeId: string) => {
    if (importByPlaceIdMutation.isPending) return;
    setSelectedPlaceId(placeId);
    importByPlaceIdMutation.mutate({ placeId });
  };

  const debouncedQuery = useDebouncedValue(searchQuery, 350);
  const trimmedQuery = debouncedQuery.trim();
  const searchResults = trpc.ingestion.searchByName.useQuery(
    { query: trimmedQuery },
    { enabled: trimmedQuery.length >= 2 }
  );

  const isPending = importMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setUrl("");
          setSearchQuery("");
          setSelectedPlaceId(null);
        }
      }}
    >
      <DialogTrigger render={renderTrigger ?? <Button className="gap-2" />}>
        {iconOnly ? (
          <Plus className="w-5 h-5" />
        ) : (
          <>
            <Plus className="w-4 h-4" />
            {t("add_restaurant")}
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("add_restaurant")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setMode("link")}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                mode === "link"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t("import_tab_link")}
            </button>
            <button
              type="button"
              onClick={() => setMode("search")}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                mode === "search"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t("import_tab_search")}
            </button>
          </div>

          {mode === "link" ? (
            <>
              <p className="text-sm text-muted-foreground">{t("import_description")}</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={t("import_placeholder")}
                    className="pl-9 pr-9"
                    value={url}
                    onChange={(e) => setUrl(extractUrl(e.target.value))}
                    onKeyDown={(e) => e.key === "Enter" && handleImport()}
                    disabled={isPending}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const text = await navigator.clipboard.readText().catch(() => "");
                      if (text) setUrl(extractUrl(text));
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Paste from clipboard"
                    tabIndex={-1}
                  >
                    <ClipboardPaste className="w-4 h-4" />
                  </button>
                </div>
                <Button onClick={handleImport} disabled={!url.trim() || isPending}>
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("import_button")}
                </Button>
              </div>
              {importMutation.isSuccess && (
                <p className="text-sm text-[var(--open-green)] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  {t("import_success")}
                </p>
              )}
              <p className="text-xs text-muted-foreground">{t("import_supported")}</p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{t("import_search_description")}</p>
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("import_search_placeholder")}
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={importByPlaceIdMutation.isPending}
                autoFocus
              />
              {trimmedQuery.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-xl border border-white/50 bg-[oklch(0.97_0.006_48)] shadow-[0_8px_32px_oklch(0_0_0/0.14),0_1px_0_oklch(1_0_0/0.6)_inset,0_-1px_0_oklch(0_0_0/0.04)_inset] divide-y divide-white/40 z-50">
                  {searchResults.isFetching ? (
                    <div className="space-y-2 p-2">
                      <Skeleton className="h-12 rounded-md" />
                      <Skeleton className="h-12 rounded-md" />
                      <Skeleton className="h-12 rounded-md" />
                    </div>
                  ) : searchResults.isError ? (
                    <p className="p-3 text-sm text-destructive">{t("import_search_error")}</p>
                  ) : searchResults.data && searchResults.data.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">{t("import_search_no_results")}</p>
                  ) : (
                    searchResults.data?.map((r) => {
                      const isImportingThis =
                        importByPlaceIdMutation.isPending && selectedPlaceId === r.placeId;
                      const isImportingOther =
                        importByPlaceIdMutation.isPending && selectedPlaceId !== r.placeId;
                      return (
                        <button
                          key={r.placeId}
                          type="button"
                          onClick={() => handleSelectResult(r.placeId)}
                          disabled={importByPlaceIdMutation.isPending}
                          className={cn(
                            "flex w-full items-start justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-white/40",
                            isImportingOther && "opacity-40"
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{bilingualName(r.name, r.name_zh)}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {isImportingThis ? t("import_button") + "…" : r.address}
                            </span>
                          </span>
                          {isImportingThis ? (
                            <Loader2 className="mt-0.5 w-4 h-4 shrink-0 animate-spin text-muted-foreground" />
                          ) : r.rating != null ? (
                            <span className="mt-0.5 flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground">
                              <Star className={cn("w-3 h-3 fill-current", STAR_COLOR_CLASS)} />
                              {r.rating}
                            </span>
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
