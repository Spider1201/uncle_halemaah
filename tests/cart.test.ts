import { describe, expect, it } from "vitest";

import { addCartItem, calculateCartSubtotal, mergeCartItems, removeCartItem, setCartQuantity } from "../lib/cart";

const services = [
  { slug: "shirt-care", price: 1800 },
  { slug: "suit-pressing", price: 4500 },
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

  it("steps down one at a time and caps the quantity at 99", () => {
    const items = [{ serviceSlug: "shirt-care", quantity: 3 }];

    expect(setCartQuantity(items, "shirt-care", 2)).toEqual([{ serviceSlug: "shirt-care", quantity: 2 }]);
    expect(setCartQuantity(items, "shirt-care", 100)).toEqual([{ serviceSlug: "shirt-care", quantity: 99 }]);
  });

  it("does not create an item when decreasing a missing service to zero", () => {
    expect(setCartQuantity([], "shirt-care", 0)).toEqual([]);
  });

  it("calculates subtotals from catalog values and ignores stale cart slugs", () => {
    expect(calculateCartSubtotal([
      { serviceSlug: "shirt-care", quantity: 2 },
      { serviceSlug: "suit-pressing", quantity: 1 },
      { serviceSlug: "inactive-service", quantity: 1 },
    ], services)).toBe(8100);
  });

  it("merges local and server cart items and caps at 99", () => {
    const local = [
      { serviceSlug: "shirt-care", quantity: 2 },
      { serviceSlug: "suit-pressing", quantity: 1 },
    ];
    const server = [
      { serviceSlug: "shirt-care", quantity: 3 },
      { serviceSlug: "duvet-cleaning", quantity: 1 },
    ];
    expect(mergeCartItems(local, server)).toEqual([
      { serviceSlug: "shirt-care", quantity: 5 },
      { serviceSlug: "duvet-cleaning", quantity: 1 },
      { serviceSlug: "suit-pressing", quantity: 1 },
    ]);

    expect(mergeCartItems(
      [{ serviceSlug: "shirt-care", quantity: 90 }],
      [{ serviceSlug: "shirt-care", quantity: 20 }],
    )).toEqual([
      { serviceSlug: "shirt-care", quantity: 99 },
    ]);
  });
});