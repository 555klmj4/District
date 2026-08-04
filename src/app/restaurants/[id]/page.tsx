export const revalidate = 60;

import { PageShell } from "@/components/layout/PageShell";
import { RestaurantDetail } from "@/components/restaurant/RestaurantDetail";
import { getServerCaller } from "@/server/trpc/server-caller";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/router";

type RestaurantDetailOutput = inferRouterOutputs<AppRouter>["restaurants"]["getById"];

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RestaurantPage({ params }: Props) {
  const { id } = await params;

  let initialData: RestaurantDetailOutput | undefined;
  let initialDataUpdatedAt: number | undefined;
  try {
    const caller = await getServerCaller();
    initialData = await caller.restaurants.getById({
      id,
      timezone: "Asia/Hong_Kong",
    });
    initialDataUpdatedAt = Date.now();
  } catch {
    // Unauthenticated or not found — let the client handle it normally
  }

  return (
    <PageShell>
      <RestaurantDetail id={id} initialData={initialData} initialDataUpdatedAt={initialDataUpdatedAt} />
    </PageShell>
  );
}
