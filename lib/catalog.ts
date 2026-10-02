export type ServiceItem = {
  slug: string;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  badge: string | null;
};

export type ServiceCatalogRow = {
  slug: string;
  name: string;
  description: string | null;
  unitLabel: string;
  priceKobo: number;
  badge: string | null;
};

export const CATALOG_UNAVAILABLE_MESSAGE = "Our services are temporarily unavailable. Please try again shortly.";

export const INITIAL_SERVICE_CATALOG: ServiceItem[] = [
  {
    slug: "shirt-care",
    name: "Shirt Care",
    description: "Fresh pressing and stain treatment for everyday shirts.",
    price: 1800,
    unit: "Per item",
    badge: "Best seller",
  },
  {
    slug: "suit-pressing",
    name: "Suit Pressing",
    description: "Sharp finish for suits, jackets, and formal separates.",
    price: 4500,
    unit: "Per set",
    badge: "Premium",
  },
  {
    slug: "dress-gown",
    name: "Dress & Gown",
    description: "Gentle fabric care for occasion wear and elegant pieces.",
    price: 3200,
    unit: "Per item",
    badge: "Elegant care",
  },
  {
    slug: "trouser-denim",
    name: "Trouser & Denim",
    description: "Deep clean and reshaping for denim and everyday trousers.",
    price: 1600,
    unit: "Per pair",
    badge: "Everyday",
  },
  {
    slug: "wedding-attire",
    name: "Wedding Attire",
    description: "Delicate handling for gowns, aso-ebi, and special-event pieces.",
    price: 8000,
    unit: "Per set",
    badge: "Event ready",
  },
  {
    slug: "leather-suede",
    name: "Leather & Suede",
    description: "Specialist cleaning and conditioning for luxury materials.",
    price: 6500,
    unit: "Per item",
    badge: "Specialist",
  },
  {
    slug: "curtain-care",
    name: "Curtain Care",
    description: "Refresh curtains and soft furnishings with careful finishing.",
    price: 5000,
    unit: "Per set",
    badge: "Home care",
  },
  {
    slug: "family-bundle",
    name: "Family Laundry Bundle",
    description: "A smart bundle for weekly household essentials and basics.",
    price: 7500,
    unit: "Bundle",
    badge: "Value pack",
  },
];

export function mapServiceCatalogRow(row: ServiceCatalogRow): ServiceItem {
  return {
    slug: row.slug,
    name: row.name,
    description: row.description,
    price: row.priceKobo / 100,
    unit: row.unitLabel,
    badge: row.badge,
  };
}

export async function loadServiceCatalog(
  loadRows: () => Promise<ServiceCatalogRow[]>,
): Promise<{ services: ServiceItem[]; error: string | null }> {
  try {
    return { services: (await loadRows()).map(mapServiceCatalogRow), error: null };
  } catch {
    return { services: [], error: CATALOG_UNAVAILABLE_MESSAGE };
  }
}

export function formatNaira(value: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}
