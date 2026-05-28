"use client";
import { MapPin } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface MapLaunchButtonProps {
  name: string;
  placeId?: string | null;
  lat?: string | null;
  lng?: string | null;
  className?: string;
  size?: "sm" | "default";
}

export function MapLaunchButton({
  name,
  placeId,
  lat,
  lng,
  className,
  size = "default",
}: MapLaunchButtonProps) {
  const { t } = useTranslation();

  let href: string;
  if (placeId) {
    href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${placeId}`;
  } else if (lat && lng) {
    href = `https://www.google.com/maps/search/?api=1&query=${parseFloat(lat)},${parseFloat(lng)}`;
  } else {
    href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(buttonVariants({ variant: "secondary", size }), "gap-2", className)}
    >
      <MapPin className="w-4 h-4" />
      {t("open_in_maps")}
    </a>
  );
}
