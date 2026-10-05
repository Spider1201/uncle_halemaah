import { describe, expect, it, vi } from "vitest";

import { hashSecret } from "../lib/auth/get-authenticated-user";
import { buildMobileRedirectUrl, isValidMobileRedirectUri } from "../lib/mobile-auth/redirect";
import { createMobileAuthHandlers, type MobileAuthDependencies } from "../server/mobile-auth/handlers";

describe("mobile redirect URI validation", () => {
  it("allows unclehalemaah:// and exp:// schemes", () => {
    expect(isValidMobileRedirectUri("unclehalemaah://oauth-callback")).toBe(true);
    expect(isValidMobileRedirectUri("unclehalemaah://auth")).toBe(true);
    expect(isValidMobileRedirectUri("exp://192.168.1.5:8081")).toBe(true);
    expect(isValidMobileRedirectUri("exp://localhost:8081/--/oauth")).toBe(true);
  });

  it("rejects untrusted and dangerous schemes to prevent open redirects", () => {
    expect(isValidMobileRedirectUri("https://evil.com/callback")).toBe(false);
    expect(isValidMobileRedirectUri("http://unclehalemaah.com")).toBe(false);
    expect(isValidMobileRedirectUri("javascript:alert(1)")).toBe(false);
    expect(isValidMobileRedirectUri("evil-unclehalemaah://callback")).toBe(false);
    expect(isValidMobileRedirectUri("")).toBe(false);
  });

  it("builds mobile redirect URL with code and state", () => {
    expect(buildMobileRedirectUrl("unclehalemaah://auth", "code123", "state456"))
      .toBe("unclehalemaah://auth?code=code123&state=state456");
    expect(buildMobileRedirectUrl("exp://192.168.1.5:8081/--/oauth?existing=1", "code123"))
      .toBe("exp://192.168.1.5:8081/--/oauth?existing=1&code=code123");
  });
});

describe("POST /api/mobile/auth/exchange", () => {
  function makeDependencies(overrides: Partial<MobileAuthDependencies> = {}) {
    const codes = new Map<string, {
      id: string;
      userId: string;
      expiresAt: Date;
      usedAt: Date | null;
    }>();

    const tokens = new Map<string, { userId: string; expiresAt: Date }>();

    // Seed a valid code "valid-code-123"
    const validRawCode = "valid-code-123";
    const validHash = hashSecret(validRawCode);
    codes.set(validHash, {
      id: "code-id-1",
      userId: "user-456",
      expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 min in future
      usedAt: null,
    });

    // Seed an expired code "expired-code-123"
    const expiredRawCode = "expired-code-123";
    const expiredHash = hashSecret(expiredRawCode);
    codes.set(expiredHash, {
      id: "code-id-2",
      userId: "user-456",
      expiresAt: new Date(Date.now() - 1000), // 1 sec in past
      usedAt: null,
    });

    // Seed an already-used code "used-code-123"
    const usedRawCode = "used-code-123";
    const usedHash = hashSecret(usedRawCode);
    codes.set(usedHash, {
      id: "code-id-3",
      userId: "user-456",
      expiresAt: new Date(Date.now() + 2 * 60 * 1000),
      usedAt: new Date(Date.now() - 30 * 1000), // used 30s ago
    });

    const deps: MobileAuthDependencies = {
      findCode: vi.fn(async (codeHash: string) => codes.get(codeHash) ?? null),
      markCodeUsed: vi.fn(async (codeId: string, now: Date) => {
        for (const [hash, entry] of codes.entries()) {
          if (entry.id === codeId && entry.usedAt === null && entry.expiresAt > now) {
            entry.usedAt = new Date();
            return true;
          }
        }
        return false;
      }),
      saveToken: vi.fn(async (userId: string, tokenHash: string, expiresAt: Date) => {
        tokens.set(tokenHash, { userId, expiresAt });
      }),
      revokeToken: vi.fn(async (tokenHash: string) => {
        tokens.delete(tokenHash);
      }),
      getUserById: vi.fn(async (userId: string) => ({
        id: userId,
        name: "Halemaah Customer",
        email: "customer@example.com",
        image: null,
      })),
      getAuthenticatedUser: vi.fn(async () => null),
      generateToken: () => "mock-generated-token-789",
      ...overrides,
    };

    return { deps, handlers: createMobileAuthHandlers(deps), codes, tokens };
  }

  function postJson(url: string, body: unknown, headers: Record<string, string> = {}) {
    return new Request(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  }

  it("successfully exchanges a valid code for a bearer token", async () => {
    const { handlers, deps, tokens } = makeDependencies();
    const response = await handlers.exchange(postJson("http://localhost/api/mobile/auth/exchange", {
      code: "valid-code-123",
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.token).toBe("mock-generated-token-789");
    expect(body.tokenType).toBe("Bearer");
    expect(body.user).toEqual({
      id: "user-456",
      name: "Halemaah Customer",
      email: "customer@example.com",
    });

    expect(deps.markCodeUsed).toHaveBeenCalledWith("code-id-1", expect.any(Date));
    expect(deps.findCode).toHaveBeenCalledWith(hashSecret("valid-code-123"));
    const expectedHash = hashSecret("mock-generated-token-789");
    expect(tokens.has(expectedHash)).toBe(true);
  });

  it("does not issue a token if a code expires before it can be consumed", async () => {
    const { handlers, deps } = makeDependencies({
      markCodeUsed: vi.fn(async () => false),
    });
    const response = await handlers.exchange(postJson("http://localhost/api/mobile/auth/exchange", {
      code: "valid-code-123",
    }));

    expect(response.status).toBe(400);
    expect(deps.saveToken).not.toHaveBeenCalled();
  });

  it("rejects an already used code", async () => {
    const { handlers, deps } = makeDependencies();
    const response = await handlers.exchange(postJson("http://localhost/api/mobile/auth/exchange", {
      code: "used-code-123",
    }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/already been used/i);
    expect(deps.saveToken).not.toHaveBeenCalled();
  });

  it("rejects when attempting to reuse a freshly exchanged code", async () => {
    const { handlers, deps } = makeDependencies();
    // First exchange
    const firstRes = await handlers.exchange(postJson("http://localhost/api/mobile/auth/exchange", {
      code: "valid-code-123",
    }));
    expect(firstRes.status).toBe(200);

    // Second exchange with same code
    const secondRes = await handlers.exchange(postJson("http://localhost/api/mobile/auth/exchange", {
      code: "valid-code-123",
    }));
    expect(secondRes.status).toBe(400);
    const body = await secondRes.json();
    expect(body.error).toMatch(/already been used/i);
  });

  it("rejects an expired code", async () => {
    const { handlers, deps } = makeDependencies();
    const response = await handlers.exchange(postJson("http://localhost/api/mobile/auth/exchange", {
      code: "expired-code-123",
    }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/expired/i);
    expect(deps.saveToken).not.toHaveBeenCalled();
  });

  it("rejects invalid or unknown code", async () => {
    const { handlers } = makeDependencies();
    const response = await handlers.exchange(postJson("http://localhost/api/mobile/auth/exchange", {
      code: "unknown-code",
    }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/invalid/i);
  });

  it("rejects malformed JSON and missing code field", async () => {
    const { handlers } = makeDependencies();
    const badJson = new Request("http://localhost/api/mobile/auth/exchange", {
      method: "POST",
      body: "not json",
    });
    const res1 = await handlers.exchange(badJson);
    expect(res1.status).toBe(400);

    const emptyBody = postJson("http://localhost/api/mobile/auth/exchange", {});
    const res2 = await handlers.exchange(emptyBody);
    expect(res2.status).toBe(400);
  });
});

describe("POST /api/mobile/auth/logout", () => {
  it("revokes token when Authorization: Bearer header is passed", async () => {
    const rawToken = "my-mobile-token-abc";
    const expectedHash = hashSecret(rawToken);
    const revokeToken = vi.fn(async () => {});

    const deps: MobileAuthDependencies = {
      findCode: vi.fn(),
      markCodeUsed: vi.fn(),
      saveToken: vi.fn(),
      revokeToken,
      getUserById: vi.fn(),
      getAuthenticatedUser: vi.fn(),
    };
    const handlers = createMobileAuthHandlers(deps);

    const req = new Request("http://localhost/api/mobile/auth/logout", {
      method: "POST",
      headers: { authorization: `Bearer ${rawToken}` },
    });
    const response = await handlers.logout(req);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(revokeToken).toHaveBeenCalledWith(expectedHash);
  });

  it("returns 401 when no token and no session are present", async () => {
    const deps: MobileAuthDependencies = {
      findCode: vi.fn(),
      markCodeUsed: vi.fn(),
      saveToken: vi.fn(),
      revokeToken: vi.fn(),
      getUserById: vi.fn(),
      getAuthenticatedUser: vi.fn(async () => null),
    };
    const handlers = createMobileAuthHandlers(deps);

    const req = new Request("http://localhost/api/mobile/auth/logout", { method: "POST" });
    const response = await handlers.logout(req);

    expect(response.status).toBe(401);
  });
});

describe("GET /api/me", () => {
  it("returns authenticated user details", async () => {
    const deps: MobileAuthDependencies = {
      findCode: vi.fn(),
      markCodeUsed: vi.fn(),
      saveToken: vi.fn(),
      revokeToken: vi.fn(),
      getUserById: vi.fn(async (id: string) => ({
        id,
        name: "Halemaah Customer",
        email: "customer@example.com",
        image: "https://example.com/avatar.png",
      })),
      getAuthenticatedUser: vi.fn(async () => ({
        id: "user-123",
        name: "Halemaah Customer",
        email: "customer@example.com",
      })),
    };
    const handlers = createMobileAuthHandlers(deps);

    const req = new Request("http://localhost/api/me");
    const response = await handlers.me(req);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.user).toEqual({
      id: "user-123",
      name: "Halemaah Customer",
      email: "customer@example.com",
      image: "https://example.com/avatar.png",
    });
  });

  it("returns 401 when unauthenticated", async () => {
    const deps: MobileAuthDependencies = {
      findCode: vi.fn(),
      markCodeUsed: vi.fn(),
      saveToken: vi.fn(),
      revokeToken: vi.fn(),
      getUserById: vi.fn(),
      getAuthenticatedUser: vi.fn(async () => null),
    };
    const handlers = createMobileAuthHandlers(deps);

    const req = new Request("http://localhost/api/me");
    const response = await handlers.me(req);

    expect(response.status).toBe(401);
  });
});
