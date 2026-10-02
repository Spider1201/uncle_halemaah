import { and, eq, inArray } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { orderItems, orders, services } from "@/db/schema";
import { sendOrderConfirmationEmail } from "@/lib/email/mailgun";
import { createOrderPostHandler } from "@/server/orders/create-order-handler";

export const POST = createOrderPostHandler({
  getIdentity: async () => {
    const session = await auth();
    const user = session?.user;
    if (!user?.id) return null;
    return { userId: user.id, email: user.email ?? null };
  },
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
  getSavedOrder: async (orderId, userId) => {
    const [savedOrder] = await db.select().from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
      .limit(1);
    if (!savedOrder) return null;

    const savedItems = await db.select().from(orderItems)
      .where(eq(orderItems.orderId, savedOrder.id));
    return {
      orderNumber: savedOrder.orderNumber,
      customerName: savedOrder.customerName,
      fulfillmentType: savedOrder.fulfillmentType,
      preferredDate: savedOrder.preferredDate,
      customerPhone: savedOrder.customerPhone,
      deliveryAddress: savedOrder.deliveryAddress,
      customerNote: savedOrder.customerNote,
      totalKobo: savedOrder.totalKobo,
      items: savedItems.map((item) => ({
        serviceName: item.serviceName,
        unitLabel: item.unitLabel,
        unitPriceKobo: item.unitPriceKobo,
        quantity: item.quantity,
        lineTotalKobo: item.lineTotalKobo,
      })),
    };
  },
  sendConfirmationEmail: sendOrderConfirmationEmail,
});