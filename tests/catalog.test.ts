import { describe, expect, it } from "vitest";

import { SERVICE_CATALOG, formatNaira } from "../lib/catalog";

describe("SERVICE_CATALOG", () => {
  it("contains the seeded dry cleaning services with Nigerian naira pricing", () => {
    expect(SERVICE_CATALOG.length).toBeGreaterThanOrEqual(6);
    expect(SERVICE_CATALOG[0]).toMatchObject({
      name: "Shirt Care",
      price: 1800,
      unit: "Per item",
    });
  });

  it("formats values as naira with the correct symbol", () => {
    expect(formatNaira(1800)).toBe("₦1,800");
    expect(formatNaira(0)).toBe("₦0");
  });
});
