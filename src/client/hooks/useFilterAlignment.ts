"use client";
import { useState, useCallback } from "react";

const STORAGE_KEY = "district_filter_addLeft";

// Which side the reachability-optimized filter controls sit on — shared
// between Discover and Map so the preference is consistent across both.
export function useFilterAlignment() {
  const [addLeft, setAddLeftState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  const setAddLeft = useCallback((value: boolean) => {
    localStorage.setItem(STORAGE_KEY, String(value));
    setAddLeftState(value);
  }, []);

  return { addLeft, setAddLeft };
}
