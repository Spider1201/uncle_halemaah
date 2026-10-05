import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { cartItems, services } from "@/db/schema";
import type { CartServiceReference } from "@/server/cart/handlers";

export async function listUserCart(userId: string) {
  const rows = await db.select({
    serviceId: services.id,
    serviceSlug: services.slug,
    slug: services.slug,
    name: services.name,
    serviceName: services.name,
    unitLabel: services.unitLabel,
    priceKobo: services.priceKobo,
    isActive: services.isActive,
    quantity: cartItems.quantity,
  })
    .from(cartItems)
    .innerJoin(services, eq(cartItems.serviceId, services.id))
    .where(and(eq(cartItems.userId, userId), eq(services.isActive, true)))
    .orderBy(services.sortOrder);

  return rows.map((row) => ({
    ...row,
    lineTotalKobo: row.priceKobo * row.quantity,
  }));
}

export async function listActiveCartServices(): Promise<CartServiceReference[]> {
  return db.select({
    id: services.id,
    slug: services.slug,
    name: services.name,
    unitLabel: services.unitLabel,
    priceKobo: services.priceKobo,
  })
    .from(services)
    .where(eq(services.isActive, true))
    .orderBy(services.sortOrder);
}

export async function getCartService(serviceId: string) {
  const [service] = await db.select({
    serviceId: services.id,
    serviceSlug: services.slug,
    slug: services.slug,
    name: services.name,
    serviceName: services.name,
    unitLabel: services.unitLabel,
    priceKobo: services.priceKobo,
    isActive: services.isActive,
  })
    .from(services)
    .where(eq(services.id, serviceId))
    .limit(1);
  return service ?? null;
}

export async function upsertUserCartItem(userId: string, serviceId: string, quantity: number) {
  await db.insert(cartItems)
    .values({ userId, serviceId, quantity, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [cartItems.userId, cartItems.serviceId],
      set: { quantity, updatedAt: new Date() },
    });
}

export async function removeUserCartItem(userId: string, serviceId: string) {
  await db.delete(cartItems)
    .where(and(eq(cartItems.userId, userId), eq(cartItems.serviceId, serviceId)));
}

export async function clearUserCart(userId: string) {
  await db.delete(cartItems).where(eq(cartItems.userId, userId));
}