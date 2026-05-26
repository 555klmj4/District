"use client";
import { BookmarkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/client/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BookmarkButtonProps {
  restaurantId: string;
  isBookmarked: boolean;
  className?: string;
}

export function BookmarkButton({
  restaurantId,
  isBookmarked,
  className,
}: BookmarkButtonProps) {
  const utils = trpc.useUtils();
  const toggle = trpc.bookmarks.toggle.useMutation({
    onSuccess: (data) => {
      toast.success(data.bookmarked ? "Saved to bookmarks" : "Removed from bookmarks");
      void utils.bookmarks.list.invalidate();
      void utils.restaurants.list.invalidate();
    },
    onError: () => toast.error("Failed to update bookmark"),
  });

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("shrink-0 text-muted-foreground hover:text-primary", className)}
      onClick={() => toggle.mutate({ restaurant_id: restaurantId })}
      disabled={toggle.isPending}
      aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
    >
      <BookmarkIcon
        className={cn("w-5 h-5", isBookmarked && "fill-primary text-primary")}
      />
    </Button>
  );
}
