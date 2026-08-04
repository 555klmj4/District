import { PageShell } from "@/components/layout/PageShell";
import { ActivityFeed } from "@/components/activity/ActivityFeed";

export default function HistoryPage() {
  return (
    <PageShell>
      <ActivityFeed />
    </PageShell>
  );
}
