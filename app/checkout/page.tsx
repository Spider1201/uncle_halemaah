import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export default async function CheckoutPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin?callbackUrl=%2Fcheckout");

  return (
    <main className="checkout-shell">
      <header className="orders-header">
        <Link href="/" className="auth-brand">Uncle Halemaah</Link>
        <Link href="/orders" className="quiet-link">My orders</Link>
      </header>
      <div className="checkout-heading">
        <p className="section-label">Secure checkout</p>
        <h1>Review your order</h1>
        <p>Signed in as {session.user.name ?? session.user.email}</p>
      </div>
      <CheckoutForm />
    </main>
  );
}