import { describe, expect, it } from "vitest";

import { createGetServicesHandler } from "../server/services/get-services-handler";

describe("GET /api/services", () => {
  it("returns active catalog services as JSON", async () => {
    const mockServices = [
      {
        id: "serv-1",
        name: "Shirt Care",
        slug: "shirt-care",
        description: "Everyday shirt cleaning",
        unitLabel: "Per item",
        priceKobo: 180000,
        badge: "Popular",
        sortOrder: 1,
      },
    ];

    const handler = createGetServicesHandler(async () => mockServices);
    const response = await handler();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.services).toEqual(mockServices);
  });
});
