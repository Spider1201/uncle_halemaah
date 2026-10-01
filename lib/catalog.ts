export type ServiceItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  badge: string;
};

export const SERVICE_CATALOG: ServiceItem[] = [
  {
    id: "shirt-care",
    name: "Shirt Care",
    description: "Fresh pressing and stain treatment for everyday shirts.",
    price: 1800,
    unit: "Per item",
    badge: "Best seller",
  },
  {
    id: "suit-pressing",
    name: "Suit Pressing",
    description: "Sharp finish for suits, jackets, and formal separates.",
    price: 4500,
    unit: "Per set",
    badge: "Premium",
  },
  {
    id: "dress-gown",
    name: "Dress & Gown",
    description: "Gentle fabric care for occasion wear and elegant pieces.",
    price: 3200,
    unit: "Per item",
    badge: "Elegant care",
  },
  {
    id: "trouser-denim",
    name: "Trouser & Denim",
    description: "Deep clean and reshaping for denim and everyday trousers.",
    price: 1600,
    unit: "Per pair",
    badge: "Everyday",
  },
  {
    id: "wedding-attire",
    name: "Wedding Attire",
    description: "Delicate handling for gowns, aso-ebi, and special-event pieces.",
    price: 8000,
    unit: "Per set",
    badge: "Event ready",
  },
  {
    id: "leather-suede",
    name: "Leather & Suede",
    description: "Specialist cleaning and conditioning for luxury materials.",
    price: 6500,
    unit: "Per item",
    badge: "Specialist",
  },
  {
    id: "curtain-care",
    name: "Curtain Care",
    description: "Refresh curtains and soft furnishings with careful finishing.",
    price: 5000,
    unit: "Per set",
    badge: "Home care",
  },
  {
    id: "family-bundle",
    name: "Family Laundry Bundle",
    description: "A smart bundle for weekly household essentials and basics.",
    price: 7500,
    unit: "Bundle",
    badge: "Value pack",
  },
];

export function formatNaira(value: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}
