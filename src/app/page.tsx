import { HomeView } from "@/components/home/home-view";
import { PLANS } from "@/lib/dummy";
import { loadCatalog } from "@/lib/load-catalog";

export default async function HomePage() {
  let plans = PLANS;
  try {
    const catalog = await loadCatalog();
    const live = catalog.plans.filter((plan) => plan.active !== false);
    if (live.length) plans = live;
  } catch {
    /* mongo may be down */
  }
  return <HomeView plans={plans} />;
}
