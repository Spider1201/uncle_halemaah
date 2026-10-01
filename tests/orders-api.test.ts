import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createOrderPostHandler,
  type NewOrderItemRecord,
  type NewOrderRecord,
  type OrderServicePrice,
} from "../server/orders/create-order-handler";

const servicePrices: OrderServicePrice[] = [
  { id: "service-shirt", slug: "shirt-care", name: "Shirt Care", unitLabel: "Per item", priceKobo: 180000 },
  { id: "service-suit", slug: "suit-pressing", name: "Suit Pressing", unitLabel: "Per set", priceKobo: 450000 },
];

function makeDependencies(overrides: { userId?: string | null; services?: OrderServicePrice[] } = {}) {
  const savedOrders: Array<{ order: NewOrderRecord; items: NewOrderItemRecord[] }> = [];
  const dependencies = {
    getUserId: vi.fn(async () => overrides.userId === undefined ? "user-123" : overrides.userId),
    getActiveServices: vi.fn(async (slugs: string[]) => (overrides.services ?? servicePrices)
      .filter((service) => slugs.includes(service.slug))),
    saveOrder: vi.fn(async (order: NewOrderRecord, items: NewOrderItemRecord[]) => {
      savedOrders.push({ order, items });
    }),
    getToday: () => "2026-10-02",
    createId: vi.fn().mockReturnValueOnce("item-123").mockReturnValueOnce("order-123"),
    createOrderNumber: () => "UH-TEST12345",
  };
  return { dependencies, savedOrders, handler: createOrderPostHandler(dependencies) };
}

function post(body: unknown) {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validPickupOrder = {
  items: [{ serviceSlug: "shirt-care", quantity: 2 }],
  fulfillmentType: "pickup",
  customerPhone: "+234 801 234 5678",
  preferredDate: "2026-10-02",
};

describe("POST /api/orders", () => {
  it("creates an owned order using current database prices and immutable item snapshots", async () => {
    const { handler, savedOrders } = makeDependencies();

    const response = await handler(post(validPickupOrder));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ orderNumber: "UH-TEST12345", status: "received", subtotalKobo: 360000, totalKobo: 360000 });
    expect(savedOrders[0].order).toMatchObject({ userId: "user-123", fulfillmentType: "pickup", deliveryAddress: null });
    expect(savedOrders[0].items[0]).toMatchObject({
      serviceId: "service-shirt",
      serviceName: "Shirt Care",
      unitPriceKobo: 180000,
      quantity: 2,
      lineTotalKobo: 360000,
      orderId: "order-123",
    });
  });

  it("rejects unauthenticated requests", async () => {
    const { handler, dependencies } = makeDependencies({ userId: null });

    const response = await handler(post(validPickupOrder));

    expect(response.status).toBe(401);
    expect(dependencies.getActiveServices).not.toHaveBeenCalled();
  });

  it.each([
    { ...validPickupOrder, items: [] },
    { ...validPickupOrder, items: [{ serviceSlug: "shirt-care", quantity: 0 }] },
    { ...validPickupOrder, preferredDate: "2026-10-01" },
    { ...validPickupOrder, fulfillmentType: "delivery" },
    { ...validPickupOrder, items: [{ serviceSlug: "shirt-care", quantity: 1 }, { serviceSlug: "shirt-care", quantity: 2 }] },
  ])("rejects invalid checkout input", async (payload) => {
    const { handler, dependencies, savedOrders } = makeDependencies();

    const response = await handler(post(payload));

    expect(response.status).toBe(400);
    expect(dependencies.saveOrder).not.toHaveBeenCalled();
    expect(savedOrders).toHaveLength(0);
  });

  it("rejects services missing from the active database catalog", async () => {
    const { handler, dependencies } = makeDependencies({ services: [] });

    const response = await handler(post(validPickupOrder));

    expect(response.status).toBe(409);
    expect(dependencies.saveOrder).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const { handler } = makeDependencies();
    const request = new Request("http://localhost/api/orders", { method: "POST", body: "{" });

    const response = await handler(request);

    expect(response.status).toBe(400);
  });
});