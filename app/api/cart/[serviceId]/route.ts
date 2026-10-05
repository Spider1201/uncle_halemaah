import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";
import { getCartService, listActiveCartServices, listUserCart, removeUserCartItem, upsertUserCartItem } from "@/server/cart/database";
import { createCartHandlers } from "@/server/cart/handlers";

const handlers = createCartHandlers({
  getUserId: async (request?: Request) => {
    if (!request) return null;
    const user = await getAuthenticatedUser(request);
    return user?.id ?? null;
  },
  listCart: listUserCart,
  listActiveServices: listActiveCartServices,
  getService: getCartService,
  setQuantity: upsertUserCartItem,
  removeItem: removeUserCartItem,
  clearCart: async () => {},
});

export const PUT = handlers.PUT;