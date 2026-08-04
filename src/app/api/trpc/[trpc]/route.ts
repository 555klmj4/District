import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/trpc/router";
import { createTRPCContext } from "@/server/trpc/init";
import { type NextRequest } from "next/server";

// Restaurant import schedules OpenRice/AI enrichment via next/server's
// after() to run post-response — the OpenRice scrape alone can take up to
// ~25s in the worst case, so this needs enough headroom to finish.
export const maxDuration = 60;

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
    onError: ({ path, error }) => {
      console.error(`tRPC error on ${path ?? "<no-path>"}:`, error);
    },
  });

export { handler as GET, handler as POST };
