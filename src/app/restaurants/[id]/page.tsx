import { BottomNav } from "@/components/layout/BottomNav";
import { RestaurantDetail } from "@/components/restaurant/RestaurantDetail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RestaurantPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="flex flex-col min-h-dvh">
      <main className="flex-1 pb-20">
        <RestaurantDetail id={id} />
      </main>
      <BottomNav />
    </div>
  );
}
