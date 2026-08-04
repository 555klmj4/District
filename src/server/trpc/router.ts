import "server-only";
import { router } from "./init";
import { restaurantsRouter } from "./routers/restaurants";
import { bookmarksRouter } from "./routers/bookmarks";
import { colorTagsRouter } from "./routers/colorTags";
import { starsRouter } from "./routers/stars";
import { recommendationsRouter } from "./routers/recommendations";
import { preferencesRouter } from "./routers/preferences";
import { ingestionRouter } from "./routers/ingestion";
import { feedbackRouter } from "./routers/feedback";
import { activityRouter } from "./routers/activity";

export const appRouter = router({
  restaurants: restaurantsRouter,
  bookmarks: bookmarksRouter,
  colorTags: colorTagsRouter,
  stars: starsRouter,
  recommendations: recommendationsRouter,
  preferences: preferencesRouter,
  ingestion: ingestionRouter,
  feedback: feedbackRouter,
  activity: activityRouter,
});

export type AppRouter = typeof appRouter;
