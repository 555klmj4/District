"use client";
import { useState } from "react";
import { Sparkles, Loader2, Send, Check, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { RecommendationCard } from "./RecommendationCard";
import { trpc } from "@/client/trpc";
import { useLocation } from "@/client/hooks/useLocation";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import type { ScoredCandidate } from "@/shared/types/recommendation";

export function RecommendationChat() {
  const location = useLocation();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [openNow, setOpenNow] = useState(false);
  const [result, setResult] = useState<{
    historyId: string;
    candidates: ScoredCandidate[];
    explanation: string | null;
  } | null>(null);

  const generate = trpc.recommendations.generate.useMutation({
    onSuccess: (data) => {
      setResult({
        historyId: data.history_id,
        candidates: data.candidates,
        explanation: data.explanation,
      });
    },
    onError: (err) => {
      if (err.data?.code === "PRECONDITION_FAILED") {
        toast.info(err.message);
      } else {
        toast.error(err.message ?? "Failed to get recommendations");
      }
    },
  });

  const handleGenerate = () => {
    generate.mutate({
      query: query || undefined,
      lat: location.lat ?? undefined,
      lng: location.lng ?? undefined,
      open_now: openNow,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      limit: 5,
    });
  };

  const isLoading = generate.isPending;

  return (
    <div className="px-4 space-y-6">
      {/* Input area */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder={t("query_placeholder")}
            className="flex-1"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isLoading && handleGenerate()}
            disabled={isLoading}
          />
          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            className="gap-2 shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isLoading ? t("thinking") : t("suggest")}
          </Button>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <button
            className={cn(
              "flex items-center gap-1.5 transition-colors",
              openNow ? "text-[var(--open-green)]" : "hover:text-foreground"
            )}
            onClick={() => setOpenNow((v) => !v)}
          >
            <span
              className={cn(
                "w-4 h-4 rounded border flex items-center justify-center transition-all",
                openNow
                  ? "bg-[var(--open-green)] border-[var(--open-green)]"
                  : "border-border bg-card"
              )}
            >
              {openNow && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </span>
            {t("open_now_only")}
          </button>
          {location.lat && (
            <span className="inline-flex items-center gap-1 text-xs text-primary/70">
              <MapPin className="w-3 h-3" />
              {t("location_active")}
            </span>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      )}

      {/* Results */}
      {!isLoading && result && (
        <div className="space-y-4">
          {/* AI explanation */}
          {result.explanation && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                  {t("ai_insight")}
                </span>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {result.explanation}
              </p>
            </div>
          )}

          {/* Recommendation cards */}
          <div className="space-y-3">
            {result.candidates.map((candidate, i) => (
              <RecommendationCard
                key={candidate.restaurant.id}
                candidate={candidate}
                historyId={result.historyId}
                rank={i + 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty / cold start state */}
      {!isLoading && !result && (
        <div className="text-center py-12 text-muted-foreground">
          <Sparkles className="w-10 h-10 mx-auto mb-3 text-primary/40" />
          <p className="font-medium">{t("ai_advisor_title")}</p>
          <p className="text-sm mt-1 max-w-xs mx-auto">{t("ai_advisor_body")}</p>
        </div>
      )}
    </div>
  );
}
