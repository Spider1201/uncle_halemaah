import Link from "next/link";

import { signOutCurrentUser } from "@/app/auth-actions";
import { CartLink } from "@/components/cart/CartLink";

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="site-header">
      <Link href="/" className="auth-brand">Uncle Halemaah</Link>
      <nav className="site-navigation" aria-label="Main navigation">
        <Link href="/#services" className="site-nav-link">Services</Link>
        <Link href="/orders" className="site-nav-link">My orders</Link>
        <CartLink />
        {signedIn ? (
          <form action={signOutCurrentUser}>
            <button type="submit" className="quiet-button">Sign out</button>
          </form>
        ) : (
          <Link href="/signin?callbackUrl=%2Forders" className="quiet-button">Sign in</Link>
        )}
      </nav>
    </header>
  );
}