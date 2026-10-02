"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { useCart } from "@/components/cart/CartProvider";
import type { ServiceItem } from "@/lib/catalog";
import { formatNaira } from "@/lib/catalog";
import { calculateCartSubtotal } from "@/lib/cart";

type FulfillmentType = "pickup" | "delivery";

export function CheckoutForm({
  initialCustomerName,
  services,
  catalogError,
}: {
  initialCustomerName: string;
  services: ServiceItem[];
  catalogError: string | null;
}) {
  const { items, loaded, clear } = useCart();
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>("pickup");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const visibleItems = items.filter((item) => services.some((service) => service.slug === item.serviceSlug));
  const subtotal = calculateCartSubtotal(visibleItems, services);

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      items: visibleItems,
      customerName: formData.get("customerName"),
      fulfillmentType,
      customerPhone: formData.get("customerPhone"),
      preferredDate: formData.get("preferredDate"),
      deliveryAddress: formData.get("deliveryAddress") || undefined,
      customerNote: formData.get("customerNote") || undefined,
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "We could not place this order. Please try again.");
        return;
      }
      setOrderNumber(result.orderNumber);
      clear();
    } catch {
      setError("We could not reach the shop. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded) return <p className="checkout-loading">Loading your cart...</p>;

  if (catalogError) return <p className="catalog-error" role="alert">{catalogError}</p>;

  if (orderNumber) {
    return (
      <section className="checkout-success" aria-live="polite">
        <p className="empty-kicker">Order request received</p>
        <h2>Reference {orderNumber}</h2>
        <p>The shop will review your preferred date. No payment has been collected.</p>
        <Link href="/orders" className="primary-button link-button">View your orders</Link>
      </section>
    );
  }

  if (!visibleItems.length) {
    return (
      <section className="empty-orders">
        <p className="empty-kicker">Your cart is empty</p>
        <h2>Start with the care your clothes need.</h2>
        <Link href="/" className="primary-button link-button">Browse services</Link>
      </section>
    );
  }

  return (
    <form className="checkout-layout" onSubmit={submitOrder}>
      <section className="checkout-items" aria-labelledby="cart-items-title">
        <h2 id="cart-items-title">Your items</h2>
        {visibleItems.map((item) => {
          const service = services.find((entry) => entry.slug === item.serviceSlug)!;
          return (
              <article className="cart-row" key={service.slug}>
              <div className="cart-row-copy">
                <h3>{service.name}</h3>
                <p>{formatNaira(service.price)} / {service.unit.toLowerCase()}</p>
              </div>
              <span className="checkout-item-quantity">Qty {item.quantity}</span>
              <strong className="line-total">{formatNaira(service.price * item.quantity)}</strong>
            </article>
          );
        })}
        <div className="cart-subtotal"><span>Subtotal</span><strong>{formatNaira(subtotal)}</strong></div>
        <Link href="/cart" className="quiet-link checkout-edit-cart">Edit cart</Link>
      </section>

      <section className="checkout-details" aria-labelledby="checkout-details-title">
        <h2 id="checkout-details-title">Collection details</h2>
        <fieldset className="fulfillment-options">
          <legend>Fulfillment</legend>
          <label>
            <input type="radio" name="fulfillmentType" value="pickup" checked={fulfillmentType === "pickup"} onChange={() => setFulfillmentType("pickup")} />
            Shop pickup
          </label>
          <label>
            <input type="radio" name="fulfillmentType" value="delivery" checked={fulfillmentType === "delivery"} onChange={() => setFulfillmentType("delivery")} />
            Delivery
          </label>
        </fieldset>
        <label className="form-field">
          <span>Full name</span>
          <input name="customerName" type="text" autoComplete="name" defaultValue={initialCustomerName} minLength={2} maxLength={120} required />
        </label>
        <label className="form-field">
          <span>Phone number</span>
          <input name="customerPhone" type="tel" autoComplete="tel" placeholder="+234 801 234 5678" minLength={7} maxLength={30} pattern="\+?[0-9\s()\-]+" required />
        </label>
        <label className="form-field">
          <span>Preferred date</span>
          <input name="preferredDate" type="date" required />
        </label>
        {fulfillmentType === "delivery" && (
          <label className="form-field">
            <span>Delivery address</span>
            <textarea name="deliveryAddress" rows={3} maxLength={500} required />
          </label>
        )}
        <label className="form-field">
          <span>Note <small>Optional</small></span>
          <textarea name="customerNote" rows={3} maxLength={1000} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <p className="checkout-disclaimer">Your request is not a confirmed appointment. Payment is not collected online.</p>
        <button className="primary-button submit-order" type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Place order request"}
        </button>
      </section>
    </form>
  );
}