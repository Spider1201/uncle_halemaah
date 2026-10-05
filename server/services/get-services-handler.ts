export function createGetServicesHandler(
  listServices = async () => {
    const { eq } = await import("drizzle-orm");
    const { db } = await import("@/db");
    const { services } = await import("@/db/schema");

    return db
      .select({
        id: services.id,
        name: services.name,
        slug: services.slug,
        description: services.description,
        unitLabel: services.unitLabel,
        priceKobo: services.priceKobo,
        badge: services.badge,
        sortOrder: services.sortOrder,
      })
      .from(services)
      .where(eq(services.isActive, true))
      .orderBy(services.sortOrder);
  },
) {
  return async function GET(): Promise<Response> {
    const activeServices = await listServices();
    return Response.json({ services: activeServices });
  };
}
