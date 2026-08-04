import { PageShell } from "@/components/layout/PageShell";
import { DiscoverFeed } from "@/components/discover/DiscoverFeed";

export default function DiscoverPage() {
  return (
    <PageShell className="pt-0">
      <DiscoverFeed />
    </PageShell>
  );
}
