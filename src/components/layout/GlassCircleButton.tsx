"use client";
import type { ButtonHTMLAttributes, Ref } from "react";
import { cn } from "@/lib/utils";

interface GlassCircleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  side: "left" | "right";
  active?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function GlassCircleButton({ side, active, className, ref, ...props }: GlassCircleButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
      className={cn(
        "fixed z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all",
        "bg-white/35 backdrop-blur-2xl backdrop-saturate-150 border border-white/50",
        "shadow-[0_8px_32px_oklch(0_0_0/0.14),0_1px_0_oklch(1_0_0/0.6)_inset,0_-1px_0_oklch(0_0_0/0.04)_inset]",
        side === "left" ? "left-6" : "right-6",
        active
          ? "bg-white/70 text-primary shadow-[0_1px_2px_oklch(0_0_0/0.08),0_1px_0_oklch(1_0_0/0.8)_inset]"
          : "text-muted-foreground hover:text-foreground hover:bg-white/50",
        className
      )}
      {...props}
    />
  );
}
