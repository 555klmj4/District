import { PageShell } from "@/components/layout/PageShell";
import { MapView } from "@/components/map/MapView";

export default function MapPage() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY ?? "";
  return (
    <PageShell className="pt-0 pb-0">
      <MapView apiKey={apiKey} />
    </PageShell>
  );
}
