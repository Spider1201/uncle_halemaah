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

function makeDependencies(overrides: {
  userId?: string | null;
  services?: OrderServicePrice[];
  sendConfirmationEmail?: (message: { to: string; order: import("../lib/email/mailgun").ConfirmationOrder }) => Promise<void>;
} = {}) {
  const savedOrders: Array<{ order: NewOrderRecord; items: NewOrderItemRecord[] }> = [];
  const dependencies = {
    getIdentity: vi.fn(async () => overrides.userId === null
      ? null
      : { userId: overrides.userId ?? "user-123", email: "google-customer@example.com", name: "Google Customer" }),
    getActiveServices: vi.fn(async (slugs: string[]) => (overrides.services ?? servicePrices)
      .filter((service) => slugs.includes(service.slug))),
    saveOrder: vi.fn(async (order: NewOrderRecord, items: NewOrderItemRecord[]) => {
      savedOrders.push({ order, items });
    }),
    getSavedOrder: vi.fn(async (orderId: string, userId: string) => {
      const saved = savedOrders.find(({ order }) => order.id === orderId && order.userId === userId);
      if (!saved) return null;
      return {
        orderNumber: saved.order.orderNumber,
        customerName: saved.order.customerName,
        fulfillmentType: saved.order.fulfillmentType,
        preferredDate: saved.order.preferredDate,
        customerPhone: saved.order.customerPhone,
        deliveryAddress: saved.order.deliveryAddress,
        customerNote: saved.order.customerNote,
        totalKobo: saved.order.totalKobo,
        items: saved.items.map(({ serviceName, unitLabel, unitPriceKobo, quantity, lineTotalKobo }) => ({
          serviceName, unitLabel, unitPriceKobo, quantity, lineTotalKobo,
        })),
      };
    }),
    sendConfirmationEmail: vi.fn(overrides.sendConfirmationEmail ?? (async () => {})),
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
  customerName: "Google Customer",
  fulfillmentType: "pickup",
  customerPhone: "+234 801 234 5678",
  preferredDate: "2026-10-02",
};

describe("POST /api/orders", () => {
  it("creates an owned order using current database prices and immutable item snapshots", async () => {
    const { handler, savedOrders, dependencies } = makeDependencies();

    const response = await handler(post(validPickupOrder));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ orderNumber: "UH-TEST12345", status: "received", subtotalKobo: 360000, totalKobo: 360000 });
    expect(savedOrders[0].order).toMatchObject({ userId: "user-123", customerName: "Google Customer", fulfillmentType: "pickup", deliveryAddress: null });
    expect(savedOrders[0].items[0]).toMatchObject({
      serviceId: "service-shirt",
      serviceName: "Shirt Care",
      unitPriceKobo: 180000,
      quantity: 2,
      lineTotalKobo: 360000,
      orderId: "order-123",
    });
    expect(dependencies.getSavedOrder).toHaveBeenCalledWith("order-123", "user-123");
    expect(dependencies.sendConfirmationEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "google-customer@example.com",
      order: expect.objectContaining({
        orderNumber: "UH-TEST12345",
        customerName: "Google Customer",
        totalKobo: 360000,
        items: [expect.objectContaining({ unitPriceKobo: 180000, quantity: 2 })],
      }),
    }));
  });

  it("rejects unauthenticated requests", async () => {
    const { handler, dependencies } = makeDependencies({ userId: null });

    const response = await handler(post(validPickupOrder));

    expect(response.status).toBe(401);
    expect(dependencies.getActiveServices).not.toHaveBeenCalled();
  });

  it("rejects request-supplied identity and totals", async () => {
    const { handler, dependencies } = makeDependencies();

    const response = await handler(post({ ...validPickupOrder, email: "attacker@example.com", totalKobo: 1 }));

    expect(response.status).toBe(400);
    expect(dependencies.saveOrder).not.toHaveBeenCalled();
  });

  it("keeps checkout successful and logs no error details when confirmation email fails", async () => {
    const emailSender = vi.fn(async () => { throw new Error("api key should not be logged"); });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { handler, dependencies, savedOrders } = makeDependencies({ sendConfirmationEmail: emailSender });

    const response = await handler(post(validPickupOrder));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.orderNumber).toBe("UH-TEST12345");
    expect(savedOrders).toHaveLength(1);
    expect(dependencies.getSavedOrder).toHaveBeenCalledWith("order-123", "user-123");
    expect(emailSender.mock.invocationCallOrder[0]).toBeGreaterThan(dependencies.saveOrder.mock.invocationCallOrder[0]);
    expect(log).toHaveBeenCalledWith("Order confirmation email failed after the order was saved.", { orderId: "order-123" });
    expect(JSON.stringify(log.mock.calls)).not.toContain("api key should not be logged");

    log.mockRestore();
  });

  it.each([
    { ...validPickupOrder, customerName: " " },
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