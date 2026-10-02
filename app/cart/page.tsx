import Link from "next/link";

import { auth } from "@/auth";
import { CartPageContent } from "@/components/cart/CartPageContent";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { loadServiceCatalog } from "@/lib/catalog";
import { getActiveServiceCatalogRows } from "@/server/services/get-active-catalog";

export default async function CartPage() {
  const [catalog, session] = await Promise.all([
    loadServiceCatalog(getActiveServiceCatalogRows),
    auth().catch(() => null),
  ]);

  return (
    <main className="checkout-shell cart-shell">
      <SiteHeader signedIn={Boolean(session?.user)} />
      <div className="checkout-heading cart-heading">
        <Link href="/" className="back-link"><span aria-hidden="true">←</span> Back to services</Link>
        <p className="section-label">Your selection</p>
        <h1>Your cart</h1>
      </div>
      <CartPageContent services={catalog.services} catalogError={catalog.error} />
    </main>
  );
}