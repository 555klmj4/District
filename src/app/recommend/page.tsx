import { PageShell } from "@/components/layout/PageShell";
import { RecommendationChat } from "@/components/recommendation/RecommendationChat";

export default function RecommendPage() {
  return (
    <PageShell title="AI Recommendations">
      <div className="pt-4">
        <RecommendationChat />
      </div>
    </PageShell>
  );
}
