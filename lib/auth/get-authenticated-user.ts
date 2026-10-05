import { createHash } from "node:crypto";

export type AuthenticatedUser = {
  id: string;
  email: string | null;
  name: string | null;
};

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export type AuthDependencies = {
  getBearerTokenUser?: (tokenHash: string) => Promise<AuthenticatedUser | null>;
  getSessionUser?: () => Promise<AuthenticatedUser | null>;
};

export async function getAuthenticatedUser(
  request: Request,
  overrides?: AuthDependencies,
): Promise<AuthenticatedUser | null> {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const rawToken = authHeader.slice(7).trim();
    if (!rawToken) return null;
    const tokenHash = hashSecret(rawToken);

    if (overrides?.getBearerTokenUser) {
      return overrides.getBearerTokenUser(tokenHash);
    }

    // Lazy import to avoid loading DB in test environments that inject overrides
    const { and, eq, gt } = await import("drizzle-orm");
    const { db } = await import("@/db");
    const { mobileTokens, users } = await import("@/db/schema");

    const [record] = await db
      .select({
        userId: mobileTokens.userId,
        userEmail: users.email,
        userName: users.name,
      })
      .from(mobileTokens)
      .innerJoin(users, eq(mobileTokens.userId, users.id))
      .where(and(eq(mobileTokens.tokenHash, tokenHash), gt(mobileTokens.expiresAt, new Date())))
      .limit(1);

    if (!record) return null;
    return {
      id: record.userId,
      email: record.userEmail,
      name: record.userName,
    };
  }

  if (overrides?.getSessionUser) {
    return overrides.getSessionUser();
  }

  // Lazy import to avoid loading next-auth in test environments that inject overrides
  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session?.user?.id) return null;

  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
  };
}
