"use client";
import { useState } from "react";
import { Plus, Link2, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function ImportDialog() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const { t } = useTranslation();

  const utils = trpc.useUtils();
  const importMutation = trpc.ingestion.importUrl.useMutation({
    onSuccess: (data) => {
      toast.success(
        data.was_duplicate
          ? `Already saved: ${data.restaurant.name}`
          : `Saved: ${data.restaurant.name}`
      );
      void utils.restaurants.list.invalidate();
      void utils.bookmarks.list.invalidate();
      setUrl("");
      setOpen(false);
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to import restaurant");
    },
  });

  const bookmarkMutation = trpc.bookmarks.toggle.useMutation({
    onSuccess: () => {
      void utils.bookmarks.list.invalidate();
    },
  });

  const handleImport = () => {
    if (!url.trim()) return;
    importMutation.mutate(
      { url: url.trim() },
      {
        onSuccess: (data) => {
          bookmarkMutation.mutate({ restaurant_id: data.restaurant_id });
        },
      }
    );
  };

  const isPending = importMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="w-4 h-4" />
        {t("add_restaurant")}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("add_restaurant")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">{t("import_description")}</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("import_placeholder")}
                className="pl-9"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleImport()}
                disabled={isPending}
                autoFocus
              />
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
