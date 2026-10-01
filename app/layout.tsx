import "./globals.css";
import type { Metadata } from "next";
import { CartProvider } from "@/components/cart/CartProvider";

export const metadata: Metadata = {
  title: "Uncle Halemaah",
  description: "Dry cleaning shop ordering site",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
