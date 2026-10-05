"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { addCartItem, mergeCartItems, removeCartItem, setCartQuantity, type CartItem } from "@/lib/cart";

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
type CartService = { id: string; slug: string };

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
  const [serverServiceIds, setServerServiceIds] = useState<Record<string, string>>({});
  const [serverSignedIn, setServerSignedIn] = useState(false);
  const pendingServerWrites = useRef(0);
  const serverServiceIdsRef = useRef<Record<string, string>>({});
  const serverCartReady = useRef(false);

  useEffect(() => {
    let active = true;
    const localItems = parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY));
    setItems(localItems);
    setLoaded(true);

    async function refreshServerCart() {
      if (!serverCartReady.current || pendingServerWrites.current > 0) return;
      try {
        const response = await fetch("/api/cart", { cache: "no-store" });
        if (!active) return;
        if (response.status === 401) {
          setServerSignedIn(false);
          serverCartReady.current = false;
          return;
        }
        if (!response.ok) return;

        const result = await response.json() as { items: CartItem[]; services: CartService[] };
        const serviceIds = Object.fromEntries(result.services.map((service) => [service.slug, service.id]));
        serverServiceIdsRef.current = serviceIds;
        setServerServiceIds(serviceIds);
        setItems(result.items);
        setServerSignedIn(true);
      } catch {
        // Keep the optimistic/local copy when the network is temporarily unavailable.
      }
    }

    async function loadServerCart() {
      try {
        const response = await fetch("/api/cart", { cache: "no-store" });
        if (!active) return;
        if (response.status === 401) {
          setServerSignedIn(false);
          return;
        }
        if (!response.ok) return;

        const result = await response.json() as { items: Array<CartItem>; services: CartService[] };
        const serviceIds = Object.fromEntries(result.services.map((service) => [service.slug, service.id]));
        serverServiceIdsRef.current = serviceIds;
        setServerServiceIds(serviceIds);
        setServerSignedIn(true);

        if (localItems.length > 0) {
          const mergedItems = mergeCartItems(localItems, result.items);
          window.localStorage.removeItem(CART_STORAGE_KEY);
          setItems(mergedItems);

          pendingServerWrites.current += mergedItems.length;
          await Promise.all(mergedItems.map(async (item) => {
            const serviceId = serviceIds[item.serviceSlug];
            if (!serviceId) return;
            try {
              await fetch(`/api/cart/${serviceId}`, {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ quantity: item.quantity }),
              });
            } catch {
              // Preserve the merged local copy if a sync request cannot reach the server.
            } finally {
              pendingServerWrites.current -= 1;
            }
          }));
        } else {
          setItems(result.items);
        }

        serverCartReady.current = true;
        window.addEventListener("focus", refreshServerCart);
        const pollId = window.setInterval(refreshServerCart, 3000);
        return () => {
          window.clearInterval(pollId);
          window.removeEventListener("focus", refreshServerCart);
        };
      } catch {
        if (active) setServerSignedIn(false);
      }
    }

    let stopPolling: (() => void) | undefined;
    void loadServerCart().then((cleanup) => { stopPolling = cleanup; });
    return () => {
      active = false;
      serverCartReady.current = false;
      stopPolling?.();
    };
  }, []);

  useEffect(() => {
    if (loaded && !serverSignedIn) {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, loaded, serverSignedIn]);

  const syncItemToServer = useCallback(async (serviceSlug: string, quantity: number) => {
    if (!serverSignedIn) return;
    let serviceId = serverServiceIdsRef.current[serviceSlug] ?? serverServiceIds[serviceSlug];
    if (!serviceId) {
      try {
        const response = await fetch("/api/cart", { cache: "no-store" });
        if (response.ok) {
          const result = await response.json() as { services?: CartService[] };
          if (result.services) {
            const ids = Object.fromEntries(result.services.map((service) => [service.slug, service.id]));
            serverServiceIdsRef.current = { ...serverServiceIdsRef.current, ...ids };
            setServerServiceIds((prev) => ({ ...prev, ...ids }));
            serviceId = ids[serviceSlug];
          }
        }
      } catch {}
    }
    if (!serviceId) return;
    pendingServerWrites.current += 1;
    try {
      await fetch(`/api/cart/${serviceId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
    } catch {
      // The local cart stays available if the server write fails.
    } finally {
      pendingServerWrites.current -= 1;
    }
  }, [serverServiceIds, serverSignedIn]);

  const value: CartContextValue = {
    items,
    loaded,
    add: (serviceSlug) => {
      const next = addCartItem(items, serviceSlug);
      setItems(next);
      syncItemToServer(serviceSlug, next.find((item) => item.serviceSlug === serviceSlug)?.quantity ?? 0);
    },
    setQuantity: (serviceSlug, quantity) => {
      const next = setCartQuantity(items, serviceSlug, quantity);
      setItems(next);
      syncItemToServer(serviceSlug, next.find((item) => item.serviceSlug === serviceSlug)?.quantity ?? 0);
    },
    remove: (serviceSlug) => {
      const next = removeCartItem(items, serviceSlug);
      setItems(next);
      syncItemToServer(serviceSlug, 0);
    },
    clear: () => {
      setItems([]);
      if (serverSignedIn) {
        pendingServerWrites.current += 1;
        void fetch("/api/cart", { method: "DELETE" })
          .catch(() => {})
          .finally(() => { pendingServerWrites.current -= 1; });
      } else {
        window.localStorage.removeItem(CART_STORAGE_KEY);
      }
    },
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider.");
  return value;
}