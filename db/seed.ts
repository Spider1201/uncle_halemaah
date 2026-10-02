import { db } from "@/db";
import { services } from "@/db/schema";
import { INITIAL_SERVICE_CATALOG } from "@/lib/catalog";

async function seedServices() {
  for (const [index, service] of INITIAL_SERVICE_CATALOG.entries()) {
    await db.insert(services).values({
      name: service.name,
      slug: service.slug,
      description: service.description,
      unitLabel: service.unit,
      priceKobo: service.price * 100,
      badge: service.badge,
      isActive: true,
      sortOrder: index,
    }).onConflictDoUpdate({
      target: services.slug,
      set: {
        name: service.name,
        description: service.description,
        unitLabel: service.unit,
        priceKobo: service.price * 100,
        badge: service.badge,
        isActive: true,
        sortOrder: index,
        updatedAt: new Date(),
      },
    });
  }
}

seedServices().then(() => {
  console.log(`Seeded ${INITIAL_SERVICE_CATALOG.length} services.`);
}).catch((error: unknown) => {
  console.error("Service seed failed.", error);
  process.exitCode = 1;
});