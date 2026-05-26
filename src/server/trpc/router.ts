import "server-only";
import { router } from "./init";
import { restaurantsRouter } from "./routers/restaurants";
import { bookmarksRouter } from "./routers/bookmarks";
import { recommendationsRouter } from "./routers/recommendations";
import { preferencesRouter } from "./routers/preferences";
import { ingestionRouter } from "./routers/ingestion";
import { feedbackRouter } from "./routers/feedback";

export const appRouter = router({
  restaurants: restaurantsRouter,
  bookmarks: bookmarksRouter,
  recommendations: recommendationsRouter,
  preferences: preferencesRouter,
  ingestion: ingestionRouter,
  feedback: feedbackRouter,
});

export type AppRouter = typeof appRouter;
