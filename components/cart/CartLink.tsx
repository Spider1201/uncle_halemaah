"use client";

import Link from "next/link";

import { useCart } from "@/components/cart/CartProvider";

export function CartLink() {
  const { items } = useCart();
  const count = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <Link href="/cart" className="quiet-link" aria-label={`Cart, ${count} items`}>
      Cart <span className="cart-count">{count}</span>
    </Link>
  );
}