"use client";

import { SERVICE_CATALOG } from "@/lib/catalog";
import { useCart } from "@/components/cart/CartProvider";

export function ServiceCatalog() {
  const { add } = useCart();

  return (
    <section className="catalog-grid" aria-label="Service catalog">
      {SERVICE_CATALOG.map((service) => (
        <article key={service.id} className="service-card">
          <div className="service-card-top">
            <span className="service-badge">{service.badge}</span>
            <span className="service-unit">{service.unit}</span>
          </div>

          <h3>{service.name}</h3>
          <p>{service.description}</p>

          <div className="service-footer">
            <div>
              <span className="price-label">From</span>
              <strong>{new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(service.price)}</strong>
            </div>
            <button type="button" className="add-button" onClick={() => add(service.id)}>
              Add
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}