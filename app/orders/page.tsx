import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { signOutCurrentUser } from "@/app/auth-actions";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { formatNaira } from "@/lib/catalog";
import { desc, eq, inArray } from "drizzle-orm";

export default async function OrdersPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=%2Forders");
  }

  const customerOrders = await db.select().from(orders)
    .where(eq(orders.userId, session.user.id))
    .orderBy(desc(orders.createdAt));
  const customerOrderIds = customerOrders.map((order) => order.id);
  const customerOrderItems = customerOrderIds.length
    ? await db.select().from(orderItems).where(inArray(orderItems.orderId, customerOrderIds))
    : [];
  const itemsByOrderId = new Map<string, typeof customerOrderItems>();

  for (const item of customerOrderItems) {
    const orderItemsForOrder = itemsByOrderId.get(item.orderId) ?? [];
    orderItemsForOrder.push(item);
    itemsByOrderId.set(item.orderId, orderItemsForOrder);
  }

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
              <article className="order-card" key={order.id}>
                <header className="order-card-header">
                  <div>
                    <p className="empty-kicker">{order.orderNumber}</p>
                    <time dateTime={order.createdAt.toISOString()}>
                      Placed {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(order.createdAt)}
                    </time>
                  </div>
                  <span className={`status-label status-${order.status}`}>
                    {order.status.replaceAll("_", " ")}
                  </span>
                </header>

                <ul className="order-items-list" aria-label={`Items in order ${order.orderNumber}`}>
                  {(itemsByOrderId.get(order.id) ?? []).map((item) => (
                    <li className="order-item-row" key={item.id}>
                      <div>
                        <strong>{item.serviceName}</strong>
                        <span>{item.quantity} × {formatNaira(item.unitPriceKobo / 100)} / {item.unitLabel.toLowerCase()}</span>
                      </div>
                      <strong>{formatNaira(item.lineTotalKobo / 100)}</strong>
                    </li>
                  ))}
                </ul>

                <div className="order-details-grid">
                  <div>
                    <span className="order-detail-label">Collection</span>
                    <strong>{order.fulfillmentType === "pickup" ? "Shop pickup" : "Delivery"}</strong>
                  </div>
                  <div>
                    <span className="order-detail-label">Preferred date</span>
                    <strong>{order.preferredDate}</strong>
                  </div>
                  <div>
                    <span className="order-detail-label">Phone</span>
                    <strong>{order.customerPhone}</strong>
                  </div>
                  {order.fulfillmentType === "delivery" && order.deliveryAddress && (
                    <div className="order-address">
                      <span className="order-detail-label">Delivery address</span>
                      <strong>{order.deliveryAddress}</strong>
                    </div>
                  )}
                  {order.customerNote && (
                    <div className="order-address">
                      <span className="order-detail-label">Note</span>
                      <strong>{order.customerNote}</strong>
                    </div>
                  )}
                </div>

                <footer className="order-card-total">
                  <span>Total</span>
                  <strong>{formatNaira(order.totalKobo / 100)}</strong>
                </footer>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}