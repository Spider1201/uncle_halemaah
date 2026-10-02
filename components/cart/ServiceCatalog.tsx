"use client";

import { useState } from "react";

import type { ServiceItem } from "@/lib/catalog";
import { useCart } from "@/components/cart/CartProvider";

export function ServiceCatalog({ services }: { services: ServiceItem[] }) {
  const { items, add, setQuantity } = useCart();
  const [addedService, setAddedService] = useState<string | null>(null);

  function addService(serviceSlug: string) {
    add(serviceSlug);
    setAddedService(serviceSlug);
    window.setTimeout(() => {
      setAddedService((current) => current === serviceSlug ? null : current);
    }, 1800);
  }

  return (
    <section className="catalog-grid" aria-label="Service catalog">
      {services.map((service) => (
        <article key={service.slug} className="service-card">
          <div className="service-card-top">
            {service.badge && <span className="service-badge">{service.badge}</span>}
            <span className="service-unit">{service.unit}</span>
          </div>

          <h3>{service.name}</h3>
          <p>{service.description}</p>

          <div className="service-footer">
            <div>
              <span className="price-label">From</span>
              <strong>{new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(service.price)}</strong>
            </div>
            {(() => {
              const quantity = items.find((item) => item.serviceSlug === service.slug)?.quantity ?? 0;
              return quantity === 0 ? (
                <button type="button" className="add-button" onClick={() => addService(service.slug)}>
                  Add
                </button>
              ) : (
                <div className="catalog-quantity-control" role="group" aria-label={`${service.name} quantity`}>
                  <button
                    type="button"
                    className="quantity-stepper-button"
                    aria-label={`Remove one ${service.name}`}
                    onClick={() => setQuantity(service.slug, quantity - 1)}
                  >
                    <span aria-hidden="true">−</span>
                  </button>
                  <output className="catalog-quantity" aria-label={`${quantity} in cart`}>{quantity}</output>
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
              );
            })()}
          </div>
          <p className="cart-add-confirmation" aria-live="polite" aria-atomic="true">
            {addedService === service.slug ? `${service.name} added to cart` : ""}
          </p>
        </article>
      ))}
    </section>
  );
}