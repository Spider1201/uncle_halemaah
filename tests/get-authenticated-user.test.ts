import { describe, expect, it, vi } from "vitest";

import { getAuthenticatedUser, hashSecret } from "../lib/auth/get-authenticated-user";

describe("getAuthenticatedUser helper", () => {
  it("authenticates using a valid Bearer token", async () => {
    const rawToken = "test-mobile-token-123";
    const expectedHash = hashSecret(rawToken);

    const getBearerTokenUser = vi.fn(async (hash: string) => {
      if (hash === expectedHash) {
        return { id: "user-bearer-1", email: "bearer@example.com", name: "Bearer User" };
      }
      return null;
    });

    const request = new Request("http://localhost/api/test", {
      headers: { authorization: `Bearer ${rawToken}` },
    });

    const user = await getAuthenticatedUser(request, { getBearerTokenUser });
    expect(user).toEqual({
      id: "user-bearer-1",
      email: "bearer@example.com",
      name: "Bearer User",
    });
    expect(getBearerTokenUser).toHaveBeenCalledWith(expectedHash);
  });

  it("returns null for an invalid or expired Bearer token", async () => {
    const getBearerTokenUser = vi.fn(async () => null);

    const request = new Request("http://localhost/api/test", {
      headers: { authorization: "Bearer invalid-token" },
    });

    const user = await getAuthenticatedUser(request, { getBearerTokenUser });
    expect(user).toBeNull();
  });

  it("falls back to Auth.js session when no Bearer header is present", async () => {
    const getSessionUser = vi.fn(async () => ({
      id: "user-session-2",
      email: "session@example.com",
      name: "Session User",
    }));

    const request = new Request("http://localhost/api/test");

    const user = await getAuthenticatedUser(request, { getSessionUser });
    expect(user).toEqual({
      id: "user-session-2",
      email: "session@example.com",
      name: "Session User",
    });
    expect(getSessionUser).toHaveBeenCalled();
  });

  it("returns null when neither Bearer token nor Auth.js session is valid", async () => {
    const getSessionUser = vi.fn(async () => null);
    const request = new Request("http://localhost/api/test");

    const user = await getAuthenticatedUser(request, { getSessionUser });
    expect(user).toBeNull();
  });
});
