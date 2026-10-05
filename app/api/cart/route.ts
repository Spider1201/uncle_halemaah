import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import { clearUserCart, listActiveCartServices, listUserCart } from "@/server/cart/database";
import { createCartHandlers } from "@/server/cart/handlers";

const handlers = createCartHandlers({
  getUserId: async (request?: Request) => {
    if (!request) return null;
    const user = await getAuthenticatedUser(request);
    return user?.id ?? null;
  },
  listCart: listUserCart,
  listActiveServices: listActiveCartServices,
  getService: async () => null,
  setQuantity: async () => {},
  removeItem: async () => {},
  clearCart: clearUserCart,
});

export const GET = handlers.GET;
export const DELETE = handlers.DELETE;