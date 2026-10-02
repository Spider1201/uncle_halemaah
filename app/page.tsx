import Link from "next/link";
import { auth } from "@/auth";
import { ServiceCatalog } from "@/components/cart/ServiceCatalog";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { loadServiceCatalog } from "@/lib/catalog";
import { getActiveServiceCatalogRows } from "@/server/services/get-active-catalog";

export default async function HomePage() {
  const [session, catalog] = await Promise.all([
    auth().catch(() => null),
    loadServiceCatalog(getActiveServiceCatalogRows),
  ]);

  return (
    <main className="catalog-shell">
      <SiteHeader signedIn={Boolean(session?.user)} />
      <section className="hero-card">
        <div className="hero-copy">
          <h1>Clothes cared for, life made easier.</h1>
          <p className="subtitle">
            Professional cleaning and careful finishing for everything you wear.
          </p>
          <Link href="#services" className="primary-button hero-cta">Browse services</Link>
        </div>
      </section>

      <section className="catalog-header" id="services">
        <div>
          <p className="section-label">Services</p>
          <h2>Choose a service</h2>
        </div>
        <Link href="/cart" className="quiet-link">View cart</Link>
      </section>

      {catalog.error ? (
        <p className="catalog-error" role="alert">{catalog.error}</p>
      ) : catalog.services.length > 0 ? (
        <ServiceCatalog services={catalog.services} />
      ) : (
        <p className="catalog-empty">No services are available right now. Please check back shortly.</p>
      )}
      <SiteFooter />
    </main>
  );
}
