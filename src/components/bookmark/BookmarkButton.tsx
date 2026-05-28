"use client";
import { BookmarkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/client/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

interface BookmarkButtonProps {
  restaurantId: string;
  isBookmarked: boolean;
  className?: string;
}

export function BookmarkButton({ restaurantId, isBookmarked, className }: BookmarkButtonProps) {
  const { t } = useTranslation();
  const utils = trpc.useUtils();

  const toggle = trpc.bookmarks.toggle.useMutation({
    onSuccess: (data) => {
      toast.success(data.bookmarked ? t("saved_toast") : t("unsaved_toast"));
      void utils.bookmarks.list.invalidate();
      void utils.restaurants.list.invalidate();
    },
    onError: () => toast.error(t("bookmark_error")),
  });

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("shrink-0 text-muted-foreground hover:text-primary", className)}
      onClick={() => toggle.mutate({ restaurant_id: restaurantId })}
      disabled={toggle.isPending}
      aria-label={isBookmarked ? t("unsaved_toast") : t("saved_toast")}
    >
      <BookmarkIcon className={cn("w-5 h-5", isBookmarked && "fill-primary text-primary")} />
    </Button>
  );
}
