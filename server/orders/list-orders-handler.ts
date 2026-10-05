import { getAuthenticatedUser, type AuthenticatedUser } from "@/lib/auth/get-authenticated-user";

export type ListOrdersDependencies = {
  getAuthenticatedUser: (request: Request) => Promise<AuthenticatedUser | null>;
  listUserOrders?: (userId: string) => Promise<Array<any>>;
};

export function createListOrdersHandler(dependencies: ListOrdersDependencies = { getAuthenticatedUser }) {
  return async function GET(request: Request): Promise<Response> {
    const user = await dependencies.getAuthenticatedUser(request);
    if (!user) {
      return Response.json({ error: "Sign in is required to view orders." }, { status: 401 });
    }

    if (dependencies.listUserOrders) {
      const result = await dependencies.listUserOrders(user.id);
      return Response.json({ orders: result });
    }

    // Lazy import to avoid loading DB when listUserOrders override is injected
    const { desc, eq, inArray } = await import("drizzle-orm");
    const { db } = await import("@/db");
    const { orderItems, orders } = await import("@/db/schema");

    const customerOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, user.id))
      .orderBy(desc(orders.createdAt));

    const customerOrderIds = customerOrders.map((order) => order.id);
    const customerOrderItems = customerOrderIds.length
      ? await db
          .select()
          .from(orderItems)
          .where(inArray(orderItems.orderId, customerOrderIds))
      : [];

    const itemsByOrderId = new Map<string, typeof customerOrderItems>();
    for (const item of customerOrderItems) {
      const current = itemsByOrderId.get(item.orderId) ?? [];
      current.push(item);
      itemsByOrderId.set(item.orderId, current);
    }

    const result = customerOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      status: order.status,
      fulfillmentType: order.fulfillmentType,
      customerPhone: order.customerPhone,
      preferredDate: order.preferredDate,
      deliveryAddress: order.deliveryAddress,
      customerNote: order.customerNote,
      subtotalKobo: order.subtotalKobo,
      deliveryFeeKobo: order.deliveryFeeKobo,
      totalKobo: order.totalKobo,
      createdAt: order.createdAt.toISOString(),
      items: (itemsByOrderId.get(order.id) ?? []).map((item) => ({
        id: item.id,
        serviceName: item.serviceName,
        unitLabel: item.unitLabel,
        unitPriceKobo: item.unitPriceKobo,
        quantity: item.quantity,
        lineTotalKobo: item.lineTotalKobo,
      })),
    }));

    return Response.json({ orders: result });
  };
}

