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
  if (quantity <= 0) return removeCartItem(items, serviceSlug);
  return items.map((item) => item.serviceSlug === serviceSlug
    ? { ...item, quantity: Math.min(Math.floor(quantity), 99) }
    : item);
}

export function removeCartItem(items: CartItem[], serviceSlug: string): CartItem[] {
  return items.filter((item) => item.serviceSlug !== serviceSlug);
}

export function calculateCartSubtotal<T extends { price: number }>(
  items: CartItem[],
  services: readonly (T & { id: string })[],
): number {
  const servicesBySlug = new Map(services.map((service) => [service.id, service]));
  return items.reduce((total, item) => total + (servicesBySlug.get(item.serviceSlug)?.price ?? 0) * item.quantity, 0);
}