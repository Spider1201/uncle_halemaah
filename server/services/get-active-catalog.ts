import type { ServiceCatalogRow } from "@/lib/catalog";

export async function getActiveServiceCatalogRows(): Promise<ServiceCatalogRow[]> {
  const [{ db }, { services }, { asc, eq }] = await Promise.all([
    import("@/db"),
    import("@/db/schema"),
    import("drizzle-orm"),
  ]);

  return db.select({
    slug: services.slug,
    name: services.name,
    description: services.description,
    unitLabel: services.unitLabel,
    priceKobo: services.priceKobo,
    badge: services.badge,
  })
    .from(services)
    .where(eq(services.isActive, true))
    .orderBy(asc(services.sortOrder));
}