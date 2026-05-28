"use client";
import dynamic from "next/dynamic";
import { trpc } from "@/client/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/i18n";
import { useLocation } from "@/client/hooks/useLocation";

const RestaurantMap = dynamic(
  () => import("./RestaurantMap").then((m) => m.RestaurantMap),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full" style={{ height: "calc(100dvh - 7rem)" }} />,
  }
);

export function MapView() {
  const { t } = useTranslation();
  const location = useLocation();

  const query = trpc.restaurants.list.useQuery({
    sort: "newest",
    lat: location.lat ?? undefined,
    lng: location.lng ?? undefined,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    limit: 50,
  });

  const restaurants = (query.data?.items ?? []).filter(
    (r) => r.lat && r.lng
  );

  if (query.isLoading) {
    return <Skeleton className="w-full" style={{ height: "calc(100dvh - 7rem)" }} />;
  }

  if (restaurants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-4xl mb-3">🗺️</p>
        <p className="font-medium text-foreground">{t("no_restaurants_title")}</p>
        <p className="text-sm mt-1">{t("no_restaurants_body")}</p>
      </div>
    );
  }

  return <RestaurantMap restaurants={restaurants} />;
}
