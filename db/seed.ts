import { db } from "@/db";
import { services } from "@/db/schema";
import { SERVICE_CATALOG } from "@/lib/catalog";

async function seedServices() {
  for (const [index, service] of SERVICE_CATALOG.entries()) {
    await db.insert(services).values({
      name: service.name,
      slug: service.id,
      description: service.description,
      unitLabel: service.unit,
      priceKobo: service.price * 100,
      isActive: true,
      sortOrder: index,
    }).onConflictDoUpdate({
      target: services.slug,
      set: {
        name: service.name,
        description: service.description,
        unitLabel: service.unit,
        priceKobo: service.price * 100,
        isActive: true,
        sortOrder: index,
        updatedAt: new Date(),
      },
    });
  }
}

seedServices().then(() => {
  console.log(`Seeded ${SERVICE_CATALOG.length} services.`);
}).catch((error: unknown) => {
  console.error("Service seed failed.", error);
  process.exitCode = 1;
});