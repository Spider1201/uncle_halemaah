"use client";

import type { ServiceItem } from "@/lib/catalog";
import { useCart } from "@/components/cart/CartProvider";

export function ServiceCatalog({ services }: { services: ServiceItem[] }) {
  const { add } = useCart();

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
            <button type="button" className="add-button" onClick={() => add(service.slug)}>
              Add
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}