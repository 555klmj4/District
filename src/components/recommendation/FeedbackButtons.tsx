"use client";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/client/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FeedbackButtonsProps {
  historyId: string;
  restaurantId: string;
  className?: string;
}

export function FeedbackButtons({
  historyId,
  restaurantId,
  className,
}: FeedbackButtonsProps) {
  const submit = trpc.feedback.submit.useMutation({
    onSuccess: (_, vars) => {
      const msg =
        vars.signal === "thumbs_up"
          ? "Thanks! We'll recommend more like this."
          : "Got it, we'll adjust your recommendations.";
      toast.success(msg);
    },
    onError: () => toast.error("Failed to save feedback"),
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
        <ThumbsUp className="w-4 h-4" />
        Good pick
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
        <ThumbsDown className="w-4 h-4" />
        Not for me
      </Button>
    </div>
  );
}
