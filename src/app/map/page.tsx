import { PageShell } from "@/components/layout/PageShell";
import { MapView } from "@/components/map/MapView";

export default function MapPage() {
  return (
    <PageShell titleKey="page_map" className="pt-0 pb-0">
      <MapView />
    </PageShell>
  );
}
