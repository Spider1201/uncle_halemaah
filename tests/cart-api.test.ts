import { describe, expect, it, vi } from "vitest";

import {
  createCartHandlers,
  type CartServiceReference,
  type CartServiceRow,
} from "../server/cart/handlers";

const mockActiveServices: CartServiceReference[] = [
  { id: "a1111111-1111-4111-8111-111111111111", slug: "shirt-care", name: "Shirt Care", unitLabel: "Per item", priceKobo: 180000 },
  { id: "b2222222-2222-4222-8222-222222222222", slug: "suit-pressing", name: "Suit Pressing", unitLabel: "Per set", priceKobo: 450000 },
];

function makeCartDependencies(overrides: {
  userId?: string | null;
  items?: CartServiceRow[];
  services?: CartServiceReference[];
} = {}) {
  let cartRows: CartServiceRow[] = overrides.items
    ? [...overrides.items]
    : [
        {
          serviceId: "a1111111-1111-4111-8111-111111111111",
          serviceSlug: "shirt-care",
          name: "Shirt Care",
          unitLabel: "Per item",
          priceKobo: 180000,
          isActive: true,
          quantity: 2,
          lineTotalKobo: 360000,
        },
      ];

  const dependencies = {
    getUserId: vi.fn(async () => overrides.userId === null ? null : (overrides.userId ?? "user-123")),
    listCart: vi.fn(async () => cartRows),
    listActiveServices: vi.fn(async () => overrides.services ?? mockActiveServices),
    getService: vi.fn(async (serviceId: string) => {
      const match = (overrides.services ?? mockActiveServices).find((s) => s.id === serviceId);
      if (!match) return null;
      return {
        serviceId: match.id,
        serviceSlug: match.slug,
        name: match.name ?? "Service",
        unitLabel: match.unitLabel ?? "Per item",
        priceKobo: match.priceKobo ?? 100000,
        isActive: true,
      };
    }),
    setQuantity: vi.fn(async (_userId: string, serviceId: string, quantity: number) => {
      const match = (overrides.services ?? mockActiveServices).find((s) => s.id === serviceId);
      const existing = cartRows.find((row) => row.serviceId === serviceId);
      if (existing) {
        existing.quantity = quantity;
        existing.lineTotalKobo = existing.priceKobo * quantity;
      } else if (match) {
        cartRows.push({
          serviceId: match.id,
          serviceSlug: match.slug,
          name: match.name ?? "Service",
          unitLabel: match.unitLabel ?? "Per item",
          priceKobo: match.priceKobo ?? 100000,
          isActive: true,
          quantity,
          lineTotalKobo: (match.priceKobo ?? 100000) * quantity,
        });
      }
    }),
    removeItem: vi.fn(async (_userId: string, serviceId: string) => {
      cartRows = cartRows.filter((row) => row.serviceId !== serviceId);
    }),
    clearCart: vi.fn(async () => {
      cartRows = [];
    }),
  };

  return { dependencies, handlers: createCartHandlers(dependencies) };
}

describe("GET /api/cart", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const { handlers } = makeCartDependencies({ userId: null });
    const response = await handlers.GET();
    expect(response.status).toBe(401);
  });

  it("returns cart items with authoritative database prices and subtotal", async () => {
    const { handlers } = makeCartDependencies();
    const response = await handlers.GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      serviceId: "a1111111-1111-4111-8111-111111111111",
      serviceSlug: "shirt-care",
      priceKobo: 180000,
      quantity: 2,
    });
    expect(body.subtotalKobo).toBe(360000);
    expect(body.services).toHaveLength(2);
  });

  it("returns empty items and subtotal 0 when cart is empty", async () => {
    const { handlers } = makeCartDependencies({ items: [] });
    const response = await handlers.GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.items).toEqual([]);
    expect(body.subtotalKobo).toBe(0);
  });
});

describe("PUT /api/cart/[serviceId]", () => {
  const serviceId = "a1111111-1111-4111-8111-111111111111";

  function putRequest(body: unknown) {
    return new Request(`http://localhost/api/cart/${serviceId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("rejects unauthenticated requests with 401", async () => {
    const { handlers } = makeCartDependencies({ userId: null });
    const response = await handlers.PUT(putRequest({ quantity: 1 }), {
      params: Promise.resolve({ serviceId }),
    });
    expect(response.status).toBe(401);
  });

  it("rejects invalid service UUID with 400", async () => {
    const { handlers } = makeCartDependencies();
    const response = await handlers.PUT(putRequest({ quantity: 1 }), {
      params: Promise.resolve({ serviceId: "not-a-uuid" }),
    });
    expect(response.status).toBe(400);
  });

  it("rejects malformed JSON with 400", async () => {
    const { handlers } = makeCartDependencies();
    const badRequest = new Request(`http://localhost/api/cart/${serviceId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: "not json",
    });
    const response = await handlers.PUT(badRequest, {
      params: Promise.resolve({ serviceId }),
    });
    expect(response.status).toBe(400);
  });

  it.each([
    { quantity: -1 },
    { quantity: 100 },
    { quantity: 2.5 },
    { quantity: "three" },
    {},
  ])("rejects invalid quantity input with 400: %o", async (body) => {
    const { handlers } = makeCartDependencies();
    const response = await handlers.PUT(putRequest(body), {
      params: Promise.resolve({ serviceId }),
    });
    expect(response.status).toBe(400);
  });

  it("rejects nonexistent service with 404", async () => {
    const { handlers } = makeCartDependencies();
    const missingId = "c3333333-3333-4333-8333-333333333333";
    const response = await handlers.PUT(putRequest({ quantity: 2 }), {
      params: Promise.resolve({ serviceId: missingId }),
    });
    expect(response.status).toBe(404);
  });

  it("sets quantity > 0 using authoritative database price and returns updated cart", async () => {
    const { handlers, dependencies } = makeCartDependencies({ items: [] });
    const response = await handlers.PUT(putRequest({ quantity: 3 }), {
      params: Promise.resolve({ serviceId }),
    });
    expect(response.status).toBe(200);
    expect(dependencies.setQuantity).toHaveBeenCalledWith("user-123", serviceId, 3);

    const body = await response.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      serviceId,
      quantity: 3,
      priceKobo: 180000,
    });
    expect(body.subtotalKobo).toBe(540000);
  });

  it("removes item when quantity is 0", async () => {
    const { handlers, dependencies } = makeCartDependencies();
    const response = await handlers.PUT(putRequest({ quantity: 0 }), {
      params: Promise.resolve({ serviceId }),
    });
    expect(response.status).toBe(200);
    expect(dependencies.removeItem).toHaveBeenCalledWith("user-123", serviceId);

    const body = await response.json();
    expect(body.items).toHaveLength(0);
    expect(body.subtotalKobo).toBe(0);
  });
});

describe("DELETE /api/cart", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const { handlers } = makeCartDependencies({ userId: null });
    const response = await handlers.DELETE();
    expect(response.status).toBe(401);
  });

  it("clears user cart and returns empty cart state", async () => {
    const { handlers, dependencies } = makeCartDependencies();
    const response = await handlers.DELETE();
    expect(response.status).toBe(200);
    expect(dependencies.clearCart).toHaveBeenCalledWith("user-123");

    const body = await response.json();
    expect(body.items).toEqual([]);
    expect(body.subtotalKobo).toBe(0);
  });
});
