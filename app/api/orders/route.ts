import { and, eq, inArray } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { orderItems, orders, services } from "@/db/schema";
import { createOrderPostHandler } from "@/server/orders/create-order-handler";

export const POST = createOrderPostHandler({
  getUserId: async () => (await auth())?.user?.id ?? null,
  getActiveServices: async (slugs) => db
    .select({
      id: services.id,
      slug: services.slug,
      name: services.name,
      unitLabel: services.unitLabel,
      priceKobo: services.priceKobo,
    })
    .from(services)
    .where(and(inArray(services.slug, slugs), eq(services.isActive, true))),
  saveOrder: async (order, items) => {
    await db.batch([
      db.insert(orders).values(order),
      db.insert(orderItems).values(items),
    ]);
  },
});