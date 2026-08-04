"use client";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/client/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface FeedbackButtonsProps {
  historyId: string;
  restaurantId: string;
  className?: string;
}

export function FeedbackButtons({ historyId, restaurantId, className }: FeedbackButtonsProps) {
  const { t } = useTranslation();

  const submit = trpc.feedback.submit.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.signal === "thumbs_up" ? t("feedback_good_toast") : t("feedback_bad_toast"));
    },
    onError: () => toast.error(t("feedback_error")),
  });

  return (
    <div className={cn("flex gap-2", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground hover:text-[var(--open-green)]"
        disabled={submit.isPending}
        onClick={() =>
          submit.mutate({ history_id: historyId, restaurant_id: restaurantId, signal: "thumbs_up" })
        }
      >
        {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
        {t("feedback_good")}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground hover:text-destructive"
        disabled={submit.isPending}
        onClick={() =>
          submit.mutate({ history_id: historyId, restaurant_id: restaurantId, signal: "thumbs_down" })
        }
      >
        {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsDown className="w-4 h-4" />}
        {t("feedback_bad")}
      </Button>
    </div>
  );
}
