import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { createCallerFactory, createTRPCContext } from "./init";
import { appRouter } from "./router";

const createCaller = createCallerFactory(appRouter);

export const getServerCaller = cache(async () => {
  const h = await headers();
  const ctx = await createTRPCContext({ headers: h });
  return createCaller(ctx);
});
