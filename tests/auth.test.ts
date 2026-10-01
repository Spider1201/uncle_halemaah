import { describe, expect, it } from "vitest";

import { getSafeRedirectPath } from "../lib/auth/redirect";

describe("getSafeRedirectPath", () => {
  it("keeps local paths and query strings", () => {
    expect(getSafeRedirectPath("/orders?view=recent")).toBe("/orders?view=recent");
  });

  it.each(["https://example.com", "//example.com", "/\\example.com", undefined, ["/orders"]])(
    "falls back for unsafe or invalid paths: %s",
    (value) => {
      expect(getSafeRedirectPath(value)).toBe("/orders");
    },
  );
});