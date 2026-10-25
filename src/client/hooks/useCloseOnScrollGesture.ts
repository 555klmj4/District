"use client";
import { useEffect, type RefObject } from "react";

// Calls onClose when the user starts a scroll gesture outside the panel.
// Listens for touchmove/wheel rather than "scroll": picking a filter can
// shorten the list, which makes the browser fire "scroll" on its own.
export function useCloseOnScrollGesture(
  open: boolean,
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void
) {
  useEffect(() => {
    if (!open) return;
    const handle = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    window.addEventListener("touchmove", handle, { passive: true });
    window.addEventListener("wheel", handle, { passive: true });
    return () => {
      window.removeEventListener("touchmove", handle);
      window.removeEventListener("wheel", handle);
    };
  }, [open, panelRef, onClose]);
}
