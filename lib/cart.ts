export type CartItem = {
  serviceSlug: string;
  quantity: number;
};

export function addCartItem(items: CartItem[], serviceSlug: string): CartItem[] {
  const existingItem = items.find((item) => item.serviceSlug === serviceSlug);
  if (!existingItem) return [...items, { serviceSlug, quantity: 1 }];
  return items.map((item) => item.serviceSlug === serviceSlug
    ? { ...item, quantity: Math.min(item.quantity + 1, 99) }
    : item);
}

export function setCartQuantity(items: CartItem[], serviceSlug: string, quantity: number): CartItem[] {
  if (quantity < 1) return removeCartItem(items, serviceSlug);
  return items.map((item) => item.serviceSlug === serviceSlug
    ? { ...item, quantity: Math.min(Math.floor(quantity), 99) }
    : item);
}

export function removeCartItem(items: CartItem[], serviceSlug: string): CartItem[] {
  return items.filter((item) => item.serviceSlug !== serviceSlug);
}

export function mergeCartItems(localItems: CartItem[], serverItems: CartItem[]): CartItem[] {
  const merged = new Map<string, number>();
  for (const item of [...serverItems, ...localItems]) {
    merged.set(item.serviceSlug, Math.min((merged.get(item.serviceSlug) ?? 0) + item.quantity, 99));
  }
  return Array.from(merged, ([serviceSlug, quantity]) => ({ serviceSlug, quantity }));
}

export function calculateCartSubtotal<T extends { price: number }>(
  items: CartItem[],
  services: readonly (T & { slug: string })[],
): number {
  const servicesBySlug = new Map(services.map((service) => [service.slug, service]));
  return items.reduce((total, item) => total + (servicesBySlug.get(item.serviceSlug)?.price ?? 0) * item.quantity, 0);
}