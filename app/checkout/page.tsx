import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { loadServiceCatalog } from "@/lib/catalog";
import { getActiveServiceCatalogRows } from "@/server/services/get-active-catalog";

export default async function CheckoutPage() {
  const [session, catalog] = await Promise.all([
    auth(),
    loadServiceCatalog(getActiveServiceCatalogRows),
  ]);
  if (!session?.user) redirect("/signin?callbackUrl=%2Fcheckout");

  return (
    <main className="checkout-shell">
      <SiteHeader signedIn />
      <div className="checkout-heading">
        <Link href="/cart" className="back-link"><span aria-hidden="true">←</span> Back to cart</Link>
        <p className="section-label">Secure checkout</p>
        <h1>Review your order</h1>
        <p>Signed in as {session.user.name ?? session.user.email}</p>
      </div>
      <CheckoutForm
        initialCustomerName={session.user.name ?? ""}
        services={catalog.services}
        catalogError={catalog.error}
      />
    </main>
  );
}