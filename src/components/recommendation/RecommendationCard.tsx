import { Badge } from "@/components/ui/badge";
import { RatingBadge } from "@/components/restaurant/RatingBadge";
import { StatusIndicator } from "@/components/restaurant/StatusIndicator";
import { MapLaunchButton } from "@/components/restaurant/MapLaunchButton";
import { FeedbackButtons } from "./FeedbackButtons";
import { cn } from "@/lib/utils";
import type { ScoredCandidate } from "@/shared/types/recommendation";
import type { Restaurant } from "@/shared/types/restaurant";

interface RecommendationCardProps {
  candidate: ScoredCandidate;
  historyId: string;
  rank: number;
  className?: string;
}

export function RecommendationCard({
  candidate,
  historyId,
  rank,
  className,
}: RecommendationCardProps) {
  const r = candidate.restaurant as unknown as Restaurant;
  const breakdown = candidate.score_breakdown;

  return (
    <div
      className={cn(
        "bg-card rounded-xl border border-border p-4 space-y-3",
        className
      )}
    >
      {/* Rank + name */}
      <div className="flex items-start gap-3">
        <span className="text-2xl font-bold text-muted-foreground/40 leading-none mt-0.5 w-7 shrink-0">
          {rank}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground leading-snug">{r.name}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {r.cuisine_primary && (
              <Badge variant="secondary" className="text-xs py-0 px-2">
                {r.cuisine_primary}
              </Badge>
            )}
            {r.district && (
              <span className="text-xs text-muted-foreground">{r.district}</span>
            )}
            {r.distance_km != null && (
              <span className="text-xs text-muted-foreground">
                {r.distance_km < 1
                  ? `${Math.round(r.distance_km * 1000)}m`
                  : `${r.distance_km.toFixed(1)}km`}
              </span>
            )}
          </div>
        </div>
        <span className="text-xs text-muted-foreground bg-muted rounded-md px-2 py-0.5 font-mono shrink-0">
          {(candidate.score * 100).toFixed(0)}%
        </span>
      </div>

      {/* Status + Ratings */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <StatusIndicator hours={r.hours} isOpenNow={r.is_open_now} />
        <RatingBadge
          aggregate={r.rating_aggregate}
          google={r.rating_google}
          openrice={r.rating_openrice}
          yelp={r.rating_yelp}
          compact
        />
      </div>

      {/* Score breakdown (subtle) */}
      <div className="flex gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span>Taste {Math.round(breakdown.affinity * 100)}%</span>
        {breakdown.distance < 0.99 && (
          <span>Distance {Math.round(breakdown.distance * 100)}%</span>
        )}
        <span>Rating {Math.round(breakdown.rating * 100)}%</span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <MapLaunchButton
          name={r.name}
          placeId={r.google_place_id}
          lat={r.lat}
          lng={r.lng}
          size="sm"
        />
        <FeedbackButtons
          historyId={historyId}
          restaurantId={r.id}
        />
      </div>
    </div>
  );
}
