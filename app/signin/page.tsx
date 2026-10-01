import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { signInWithGoogle } from "@/app/auth-actions";
import { getSafeRedirectPath } from "@/lib/auth/redirect";

type SignInPageProps = {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const [{ callbackUrl }, session] = await Promise.all([searchParams, auth()]);
  const redirectPath = getSafeRedirectPath(callbackUrl);

  if (session?.user) {
    redirect(redirectPath);
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="signin-title">
        <Link href="/" className="auth-brand">Uncle Halemaah</Link>
        <p className="section-label">Your orders, together</p>
        <h1 id="signin-title">Sign in to continue</h1>
        <p className="auth-description">
          Use your Google account to view your order history and follow each order's progress.
        </p>
        <form action={signInWithGoogle}>
          <input type="hidden" name="callbackUrl" value={redirectPath} />
          <button className="google-button" type="submit">
            <span aria-hidden="true" className="google-mark">G</span>
            Continue with Google
          </button>
        </form>
        <Link href="/" className="text-link">Back to services</Link>
      </section>
    </main>
  );
}