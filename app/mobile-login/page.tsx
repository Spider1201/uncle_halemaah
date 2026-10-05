import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { mobileAuthCodes } from "@/db/schema";
import { hashSecret } from "@/lib/auth/get-authenticated-user";
import { buildMobileRedirectUrl, isValidMobileRedirectUri } from "@/lib/mobile-auth/redirect";

export default async function MobileLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const rawRedirectUri = resolvedParams.redirect_uri ?? resolvedParams.redirectUri;
  const redirectUri = typeof rawRedirectUri === "string" ? rawRedirectUri.trim() : "";
  const rawState = resolvedParams.state;
  const state = typeof rawState === "string" ? rawState.trim() : "";

  if (!redirectUri || !isValidMobileRedirectUri(redirectUri)) {
    return (
      <main className="orders-shell">
        <section className="orders-content" role="alert">
          <p className="section-label">Authentication Error</p>
          <h1>Invalid Redirect URI</h1>
          <p>The redirect URI must begin with <code>unclehalemaah://</code> or <code>exp://</code> to protect your account security.</p>
        </section>
      </main>
    );
  }

  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session?.user?.id) {
    const callbackPath = `/mobile-login?redirect_uri=${encodeURIComponent(redirectUri)}${state ? `&state=${encodeURIComponent(state)}` : ""}`;
    redirect(`/signin?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  const rawCode = randomBytes(24).toString("base64url");
  const codeHash = hashSecret(rawCode);
  const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

  await db.delete(mobileAuthCodes).where(eq(mobileAuthCodes.userId, session.user.id));
  await db.insert(mobileAuthCodes).values({
    userId: session.user.id,
    codeHash,
    expiresAt,
  });

  const target = buildMobileRedirectUrl(redirectUri, rawCode, state);
  redirect(target);
}
