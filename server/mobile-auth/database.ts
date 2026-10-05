import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/db";
import { mobileAuthCodes, mobileTokens, users } from "@/db/schema";

export async function findMobileAuthCode(codeHash: string) {
  const [record] = await db
    .select({
      id: mobileAuthCodes.id,
      userId: mobileAuthCodes.userId,
      expiresAt: mobileAuthCodes.expiresAt,
      usedAt: mobileAuthCodes.usedAt,
    })
    .from(mobileAuthCodes)
    .where(and(eq(mobileAuthCodes.codeHash, codeHash), gt(mobileAuthCodes.expiresAt, new Date())))
    .limit(1);
  return record ?? null;
}

export async function markMobileAuthCodeUsed(codeId: string, now: Date): Promise<boolean> {
  const result = await db
    .update(mobileAuthCodes)
    .set({ usedAt: new Date() })
    .where(and(
      eq(mobileAuthCodes.id, codeId),
      isNull(mobileAuthCodes.usedAt),
      gt(mobileAuthCodes.expiresAt, now),
    ))
    .returning({ id: mobileAuthCodes.id });
  return result.length > 0;
}

export async function saveMobileToken(userId: string, tokenHash: string, expiresAt: Date) {
  await db.insert(mobileTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });
}

export async function revokeMobileToken(tokenHash: string) {
  await db.delete(mobileTokens).where(eq(mobileTokens.tokenHash, tokenHash));
}

export async function getUserById(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ?? null;
}
