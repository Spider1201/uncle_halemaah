import { describe, expect, it } from "vitest";

import {
  CATALOG_UNAVAILABLE_MESSAGE,
  INITIAL_SERVICE_CATALOG,
  formatNaira,
  loadServiceCatalog,
} from "../lib/catalog";

describe("service catalog", () => {
  it("contains the initial dry cleaning rows used by the database seed", () => {
    expect(INITIAL_SERVICE_CATALOG.length).toBeGreaterThanOrEqual(6);
    expect(INITIAL_SERVICE_CATALOG[0]).toMatchObject({
      name: "Shirt Care",
      slug: "shirt-care",
      price: 1800,
      unit: "Per item",
    });
  });

  it("formats values as naira with the correct symbol", () => {
    expect(formatNaira(1800)).toBe("₦1,800");
    expect(formatNaira(0)).toBe("₦0");
  });

  it("maps active database rows and converts kobo prices to Naira", async () => {
    const result = await loadServiceCatalog(async () => [{
      slug: "shirt-care",
      name: "Shirt Care",
      description: "Everyday care",
      unitLabel: "Per item",
      priceKobo: 180000,
      badge: "Best seller",
    }]);

    expect(result).toEqual({
      error: null,
      services: [{
        slug: "shirt-care",
        name: "Shirt Care",
        description: "Everyday care",
        unit: "Per item",
        price: 1800,
        badge: "Best seller",
      }],
    });
  });

  it("returns a friendly unavailable state when the service query fails", async () => {
    const result = await loadServiceCatalog(async () => { throw new Error("database unavailable"); });

    expect(result).toEqual({ services: [], error: CATALOG_UNAVAILABLE_MESSAGE });
  });
});
