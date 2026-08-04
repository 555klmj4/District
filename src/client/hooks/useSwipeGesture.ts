"use client";
import { useRef, useCallback } from "react";

const DEFAULT_THRESHOLD = 40;

// Horizontal swipe detection for a single element that also has a normal
// onClick — a tap has ~0 touch movement so onClick still fires as usual;
// a swipe clearing the threshold calls the matching direction callback
// instead (touch devices don't synthesize a click after a moved touch).
export function useSwipeGesture(
  onSwipeRight: () => void,
  onSwipeLeft: () => void,
  threshold = DEFAULT_THRESHOLD
) {
  const startX = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0]!.clientX;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0]!.clientX - startX.current;
    if (dx > threshold) onSwipeRight();
    else if (dx < -threshold) onSwipeLeft();
  }, [onSwipeRight, onSwipeLeft, threshold]);

  return { onTouchStart, onTouchEnd };
}
