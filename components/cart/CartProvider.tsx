"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { addCartItem, removeCartItem, setCartQuantity, type CartItem } from "@/lib/cart";

type CartContextValue = {
  items: CartItem[];
  loaded: boolean;
  add: (serviceSlug: string) => void;
  setQuantity: (serviceSlug: string, quantity: number) => void;
  remove: (serviceSlug: string) => void;
  clear: () => void;
};

const CART_STORAGE_KEY = "uncle-halemaah-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);

function parseStoredCart(value: string | null): CartItem[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CartItem =>
      typeof item?.serviceSlug === "string"
      && /^[a-z0-9-]+$/.test(item.serviceSlug)
      && Number.isInteger(item.quantity)
      && item.quantity > 0
      && item.quantity <= 99,
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setItems(parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY)));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items, loaded]);

  const value: CartContextValue = {
    items,
    loaded,
    add: (serviceSlug) => setItems((current) => addCartItem(current, serviceSlug)),
    setQuantity: (serviceSlug, quantity) => setItems((current) => setCartQuantity(current, serviceSlug, quantity)),
    remove: (serviceSlug) => setItems((current) => removeCartItem(current, serviceSlug)),
    clear: () => setItems([]),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider.");
  return value;
}