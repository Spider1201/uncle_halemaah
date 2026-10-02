import Link from "next/link";
import { auth } from "@/auth";
import { signOutCurrentUser } from "@/app/auth-actions";
import { ServiceCatalog } from "@/components/cart/ServiceCatalog";
import { CartLink } from "@/components/cart/CartLink";
import { loadServiceCatalog } from "@/lib/catalog";
import { getActiveServiceCatalogRows } from "@/server/services/get-active-catalog";

export default async function HomePage() {
  const [session, catalog] = await Promise.all([
    auth().catch(() => null),
    loadServiceCatalog(getActiveServiceCatalogRows),
  ]);

  return (
    <main className="catalog-shell">
      <nav className="catalog-nav" aria-label="Account navigation">
        <Link href="/" className="auth-brand">Uncle Halemaah</Link>
        <div className="account-controls">
          <CartLink />
          <Link href="/orders" className="quiet-link">My orders</Link>
          {session?.user ? (
            <form action={signOutCurrentUser}>
              <button type="submit" className="quiet-button">Sign out</button>
            </form>
          ) : (
            <Link href="/signin?callbackUrl=%2Forders" className="quiet-button">Sign in</Link>
          )}
        </div>
      </nav>
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Fresh finishes, trusted care</p>
          <h1>Uncle Halemaah</h1>
          <p className="subtitle">
            Expert clothing care for busy families, professionals, and special events.
          </p>
        </div>
        <div className="hero-stats" aria-label="Service highlights">
          <div>
            <strong>{catalog.services.length}</strong>
            <span>Service options</span>
          </div>
          <div>
            <strong>NGN</strong>
            <span>Transparent pricing</span>
          </div>
        </div>
      </section>

      <section className="catalog-header">
        <div>
          <p className="section-label">Our services</p>
          <h2>Premium care for every wardrobe</h2>
        </div>
        <Link href="/checkout" className="primary-button link-button">Go to cart</Link>
      </section>

      {catalog.error ? (
        <p className="catalog-error" role="alert">{catalog.error}</p>
      ) : catalog.services.length > 0 ? (
        <ServiceCatalog services={catalog.services} />
      ) : (
        <p className="catalog-empty">No services are available right now. Please check back shortly.</p>
      )}
    </main>
  );
}
