import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { signOutCurrentUser } from "@/app/auth-actions";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { formatNaira } from "@/lib/catalog";
import { desc, eq } from "drizzle-orm";

export default async function OrdersPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=%2Forders");
  }

  const customerOrders = await db.select().from(orders)
    .where(eq(orders.userId, session.user.id))
    .orderBy(desc(orders.createdAt));

  return (
    <main className="orders-shell">
      <header className="orders-header">
        <Link href="/" className="auth-brand">Uncle Halemaah</Link>
        <div className="account-controls">
          <span className="account-name">{session.user.name ?? session.user.email}</span>
          <form action={signOutCurrentUser}>
            <button type="submit" className="quiet-button">Sign out</button>
          </form>
        </div>
      </header>
      <section className="orders-content" aria-labelledby="orders-title">
        <p className="section-label">Account</p>
        <h1 id="orders-title">Your orders</h1>
        {customerOrders.length === 0 ? (
          <div className="empty-orders">
            <p className="empty-kicker">Nothing here yet</p>
            <h2>Your next fresh start is a few clicks away.</h2>
            <p>Once you place an order, its status and details will appear here.</p>
            <Link href="/" className="primary-button link-button">Browse services</Link>
          </div>
        ) : (
          <div className="order-list">
            {customerOrders.map((order) => (
              <article className="order-row" key={order.id}>
                <div>
                  <p className="empty-kicker">{order.orderNumber}</p>
                  <h2>{order.fulfillmentType === "pickup" ? "Shop pickup" : "Delivery"}</h2>
                  <p>Preferred date: {order.preferredDate}</p>
                </div>
                <div className="order-row-summary">
                  <span className={`status-label status-${order.status}`}>{order.status.replaceAll("_", " ")}</span>
                  <strong>{formatNaira(order.totalKobo / 100)}</strong>
                  <time dateTime={order.createdAt.toISOString()}>
                    {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(order.createdAt)}
                  </time>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}