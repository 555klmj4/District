"use client";
import { useMemo, useCallback, useEffect } from "react";
import {
  Map,
  AdvancedMarker,
  Pin,
  useMap,
} from "@vis.gl/react-google-maps";
import { colorHex } from "@/lib/colors";

export interface MapRestaurant {
  id: string;
  name: string;
  lat: string | null;
  lng: string | null;
  cuisine_primary: string | null;
  district: string | null;
  price_level: number | null;
  rating_aggregate: string | null;
  is_open_now?: boolean;
  color_tags?: string[];
}

type GeoPin = MapRestaurant & { latNum: number; lngNum: number };

interface LatLngBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface LatLng {
  lat: number;
  lng: number;
}

interface FocusRequest {
  target: LatLng;
  token: number;
}

interface RestaurantMapProps {
  restaurants: MapRestaurant[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  targetBounds: LatLngBounds | null;
  focusRequest?: FocusRequest | null;
  onInteractingChange?: (interacting: boolean) => void;
}

interface PinMarkerProps {
  restaurant: GeoPin;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
}

const PIN_RED = colorHex("red");
const PIN_RED_DARK = `${PIN_RED}CC`;

function PinMarker({ restaurant: r, isSelected, onSelect }: PinMarkerProps) {
  return (
    <AdvancedMarker
      position={{ lat: r.latNum, lng: r.lngNum }}
      onClick={() => onSelect(isSelected ? null : r.id)}
      zIndex={isSelected ? 10 : 1}
    >
      <Pin
        background={isSelected ? PIN_RED_DARK : PIN_RED}
        borderColor={PIN_RED_DARK}
        glyphColor="white"
        scale={isSelected ? 1.2 : 1}
      />
    </AdvancedMarker>
  );
}

// Double-tap-and-drag "one-finger zoom" (classic Apple/Google Maps gesture):
// tap twice quickly in roughly the same spot, then — without lifting the
// finger — drag vertically to zoom continuously (up = in, down = out).
// Not a built-in Google Maps gesture, so it's implemented via raw touch
// listeners on the map's own div, layered on top of its native gestures.
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_SLOP_PX = 30;
const ZOOM_DRAG_SENSITIVITY = 100; // px of vertical drag per zoom level

type GMap = NonNullable<ReturnType<typeof useMap>>;

function useDoubleTapDragZoom(map: GMap | null) {
  useEffect(() => {
    if (!map) return;
    const el = map.getDiv();

    let lastTapTime = 0;
    let lastTapX = 0;
    let lastTapY = 0;
    let dragging = false;
    let dragStartY = 0;
    let dragStartZoom = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) { dragging = false; return; }
      const touch = e.touches[0]!;
      const now = Date.now();
      const dx = touch.clientX - lastTapX;
      const dy = touch.clientY - lastTapY;
      if (now - lastTapTime < DOUBLE_TAP_MS && Math.hypot(dx, dy) < DOUBLE_TAP_SLOP_PX) {
        dragging = true;
        dragStartY = touch.clientY;
        dragStartZoom = map.getZoom() ?? 12;
        lastTapTime = 0;
      } else {
        lastTapTime = now;
        lastTapX = touch.clientX;
        lastTapY = touch.clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!dragging || e.touches.length !== 1) return;
      e.preventDefault();
      const deltaY = dragStartY - e.touches[0]!.clientY;
      map.setZoom(dragStartZoom + deltaY / ZOOM_DRAG_SENSITIVITY);
    };

    const onTouchEnd = () => { dragging = false; };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [map]);
}

function MapController({
  targetBounds,
  focusRequest,
}: {
  targetBounds: LatLngBounds | null;
  focusRequest?: FocusRequest | null;
}) {
  const map = useMap();
  useDoubleTapDragZoom(map);

  useEffect(() => {
    if (!map || !targetBounds) return;
    map.fitBounds(targetBounds, 48);
  }, [map, targetBounds]);

  // Gently pan to a restaurant selected from an external list (as opposed to
  // a pin tap, which is already on screen) — keyed by `token` so repeated
  // selections of the same restaurant still re-pan.
  useEffect(() => {
    if (!map || !focusRequest) return;
    map.panTo(focusRequest.target);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, focusRequest?.token]);

  return null;
}

export function RestaurantMap({ restaurants, selectedId, onSelect, targetBounds, focusRequest, onInteractingChange }: RestaurantMapProps) {
  const pins = useMemo(
    () =>
      restaurants
        .filter((r) => r.lat && r.lng)
        .map((r) => ({ ...r, latNum: parseFloat(r.lat!), lngNum: parseFloat(r.lng!) })),
    [restaurants]
  );

  const defaultBounds = useMemo(() => {
    if (pins.length === 0) return undefined;
    const lats = pins.map((p) => p.latNum);
    const lngs = pins.map((p) => p.lngNum);
    const pad = pins.length === 1 ? 0.008 : 0.003;
    return {
      north: Math.max(...lats) + pad,
      south: Math.min(...lats) - pad,
      east: Math.max(...lngs) + pad,
      west: Math.min(...lngs) - pad,
      padding: 56,
    };
  }, [pins]);

  const handleMapClick = useCallback(() => {
    onSelect(null);
  }, [onSelect]);

  return (
    <Map
      mapId="DEMO_MAP_ID"
      style={{ width: "100%", height: "100%" }}
      defaultBounds={defaultBounds}
      streetViewControl={false}
      mapTypeControl={false}
      fullscreenControl={false}
      zoomControl={false}
      clickableIcons={false}
      gestureHandling="greedy"
      disableDoubleClickZoom={false}
      onClick={handleMapClick}
      onDragstart={() => onInteractingChange?.(true)}
      onIdle={() => onInteractingChange?.(false)}
    >
      <MapController targetBounds={targetBounds} focusRequest={focusRequest} />
      {pins.map((r) => (
        <PinMarker
          key={r.id}
          restaurant={r}
          isSelected={r.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </Map>
  );
}
