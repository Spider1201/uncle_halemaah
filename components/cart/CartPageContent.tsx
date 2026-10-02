"use client";

import Link from "next/link";

import { useCart } from "@/components/cart/CartProvider";
import type { ServiceItem } from "@/lib/catalog";
import { formatNaira } from "@/lib/catalog";
import { calculateCartSubtotal } from "@/lib/cart";

export function CartPageContent({
  services,
  catalogError,
}: {
  services: ServiceItem[];
  catalogError: string | null;
}) {
  const { items, loaded, setQuantity, remove } = useCart();

  if (catalogError) {
    return <p className="catalog-error" role="alert">{catalogError}</p>;
  }

  if (!loaded) return <p className="checkout-loading">Loading your cart...</p>;

  const cartItems = items.flatMap((item) => {
    const service = services.find((entry) => entry.slug === item.serviceSlug);
    return service ? [{ ...item, service }] : [];
  });
  const subtotal = calculateCartSubtotal(items, services);
  const itemCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  if (cartItems.length === 0) {
    return (
      <section className="cart-empty-state" aria-labelledby="empty-cart-title">
        <p className="empty-kicker">Nothing in your bag yet</p>
        <h2 id="empty-cart-title">Choose the care your clothes need.</h2>
        <p>Your selected services will appear here for review.</p>
        <Link href="/" className="primary-button link-button">Back to services</Link>
      </section>
    );
  }

  return (
    <div className="cart-page-layout">
      <section className="cart-page-items" aria-labelledby="cart-items-heading">
        <h2 id="cart-items-heading">Your items <span>{itemCount}</span></h2>
        <div className="cart-page-list">
          {cartItems.map(({ service, quantity }) => (
            <article className="cart-page-row" key={service.slug}>
              <div className="cart-page-service">
                <h3>{service.name}</h3>
                <p>{formatNaira(service.price)} / {service.unit.toLowerCase()}</p>
              </div>
              <div className="cart-page-quantity" role="group" aria-label={`${service.name} quantity`}>
                <button
                  type="button"
                  className="quantity-stepper-button"
                  aria-label={`Remove one ${service.name}`}
                  onClick={() => setQuantity(service.slug, quantity - 1)}
                >
                  <span aria-hidden="true">−</span>
                </button>
                <output aria-label={`${quantity} in cart`}>{quantity}</output>
                <button
                  type="button"
                  className="quantity-stepper-button"
                  aria-label={`Add one ${service.name}`}
                  onClick={() => setQuantity(service.slug, quantity + 1)}
                  disabled={quantity >= 99}
                >
                  <span aria-hidden="true">+</span>
                </button>
              </div>
              <strong className="cart-page-line-total">{formatNaira(service.price * quantity)}</strong>
              <button type="button" className="remove-button cart-page-remove" onClick={() => remove(service.slug)}>
                Remove
              </button>
            </article>
          ))}
        </div>
        <Link href="/" className="quiet-link cart-back-link">Continue browsing services</Link>
      </section>

      <aside className="cart-summary" aria-labelledby="cart-summary-heading">
        <h2 id="cart-summary-heading">Order summary</h2>
        <div className="cart-summary-line">
          <span>Subtotal</span>
          <strong>{formatNaira(subtotal)}</strong>
        </div>
        <p>Any delivery charges will be confirmed before your order is accepted.</p>
        <Link href="/checkout" className="primary-button link-button cart-continue-button">
          Continue to checkout
        </Link>
      </aside>
    </div>
  );
}