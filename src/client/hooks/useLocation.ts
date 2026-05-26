"use client";
import { useState, useCallback } from "react";

export interface LocationState {
  lat: number | null;
  lng: number | null;
  error: string | null;
  loading: boolean;
  granted: boolean | null;
}

export function useLocation() {
  const [state, setState] = useState<LocationState>(() => {
    // Restore from sessionStorage to avoid re-prompting on navigation
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("district_location");
      if (cached) {
        const { lat, lng } = JSON.parse(cached) as { lat: number; lng: number };
        return { lat, lng, error: null, loading: false, granted: true };
      }
    }
    return { lat: null, lng: null, error: null, loading: false, granted: null };
  });

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({
        ...s,
        error: "Geolocation is not supported by this browser",
        granted: false,
      }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        sessionStorage.setItem(
          "district_location",
          JSON.stringify({ lat, lng })
        );
        setState({ lat, lng, error: null, loading: false, granted: true });
      },
      (err) => {
        setState((s) => ({
          ...s,
          loading: false,
          error: err.message,
          granted: false,
        }));
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  const clear = useCallback(() => {
    sessionStorage.removeItem("district_location");
    setState({ lat: null, lng: null, error: null, loading: false, granted: null });
  }, []);

  return { ...state, request, clear };
}
