"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/client/trpc";
import { TAG_COLORS, sortColorTags } from "@/lib/colors";
import type { TagColor } from "@/lib/colors";
import { setColorTagOverride } from "@/lib/colorTagOverride";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  restaurantId: string;
  activeTags: string[];
  className?: string;
}

export function ColorPicker({ restaurantId, activeTags, className }: ColorPickerProps) {
  const [optimisticTags, setOptimisticTags] = useState<string[]>(activeTags);

  useEffect(() => {
    setOptimisticTags(activeTags);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(activeTags)]);

  const utils = trpc.useUtils();

  const toggle = trpc.colorTags.toggle.useMutation({
    onMutate: ({ color }) => {
      const newTags = sortColorTags(
        optimisticTags.includes(color)
          ? optimisticTags.filter((c) => c !== color)
          : [...optimisticTags, color]
      );
      setOptimisticTags(newTags);
      setColorTagOverride(restaurantId, newTags);
    },
    onError: (err) => {
      setOptimisticTags(activeTags);
      setColorTagOverride(restaurantId, activeTags);
      toast.error(err.message ?? "Failed to update color tag");
    },
    onSuccess: () => {
      void utils.restaurants.list.invalidate();
      void utils.restaurants.getById.invalidate({ id: restaurantId });
    },
  });

  return (
    <div className={cn("flex gap-2 items-center", className)}>
      {TAG_COLORS.map((color) => {
        const active = optimisticTags.includes(color.id);
        return (
          <button
            key={color.id}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggle.mutate({ restaurant_id: restaurantId, color: color.id as TagColor });
            }}
            className={cn(
              "w-5 h-5 rounded-full transition-all touch-manipulation shrink-0",
              active ? "ring-2 ring-white ring-offset-1 ring-offset-background" : "opacity-30 hover:opacity-70 active:opacity-90"
            )}
            style={{ backgroundColor: color.hex }}
            aria-label={color.id}
            aria-pressed={active}
          />
        );
      })}
    </div>
  );
}
