import { describe, expect, it } from "vitest";

import { addCartItem, calculateCartSubtotal, removeCartItem, setCartQuantity } from "../lib/cart";

const services = [
  { id: "shirt-care", price: 1800 },
  { id: "suit-pressing", price: 4500 },
];

describe("cart operations", () => {
  it("adds a service and increments its quantity when selected again", () => {
    expect(addCartItem([], "shirt-care")).toEqual([{ serviceSlug: "shirt-care", quantity: 1 }]);
    expect(addCartItem([{ serviceSlug: "shirt-care", quantity: 1 }], "shirt-care"))
      .toEqual([{ serviceSlug: "shirt-care", quantity: 2 }]);
  });

  it("changes quantity and removes an item when quantity reaches zero", () => {
    const items = [{ serviceSlug: "shirt-care", quantity: 1 }];
    expect(setCartQuantity(items, "shirt-care", 3)).toEqual([{ serviceSlug: "shirt-care", quantity: 3 }]);
    expect(setCartQuantity(items, "shirt-care", 0)).toEqual([]);
    expect(removeCartItem(items, "shirt-care")).toEqual([]);
  });

  it("calculates subtotals from catalog values and ignores stale cart slugs", () => {
    expect(calculateCartSubtotal([
      { serviceSlug: "shirt-care", quantity: 2 },
      { serviceSlug: "suit-pressing", quantity: 1 },
      { serviceSlug: "inactive-service", quantity: 1 },
    ], services)).toBe(8100);
  });
});