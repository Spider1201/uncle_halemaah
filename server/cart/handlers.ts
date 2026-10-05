import { z } from "zod";

const serviceIdSchema = z.string().uuid();
const updateCartInputSchema = z.object({
  quantity: z.number().int().min(0).max(99),
}).strict();

export type CartServiceRow = {
  serviceId: string;
  serviceSlug: string;
  slug?: string;
  name: string;
  serviceName?: string;
  unitLabel: string;
  priceKobo: number;
  isActive: boolean;
  quantity: number;
  lineTotalKobo?: number;
};

export type CartServiceReference = {
  id: string;
  slug: string;
  name?: string;
  unitLabel?: string;
  priceKobo?: number;
};

type CartHandlerDependencies = {
  getUserId: (request?: Request) => Promise<string | null>;
  listCart: (userId: string) => Promise<CartServiceRow[]>;
  listActiveServices: () => Promise<CartServiceReference[]>;
  getService: (serviceId: string) => Promise<Omit<CartServiceRow, "quantity"> | null>;
  setQuantity: (userId: string, serviceId: string, quantity: number) => Promise<void>;
  removeItem: (userId: string, serviceId: string) => Promise<void>;
  clearCart: (userId: string) => Promise<void>;
};

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export function createCartHandlers(dependencies: CartHandlerDependencies) {
  return {
    GET: async (request: Request): Promise<Response> => {
      const userId = await dependencies.getUserId(request);
      if (!userId) return errorResponse("Sign in is required to access your cart.", 401);

      const [items, services] = await Promise.all([
        dependencies.listCart(userId),
        dependencies.listActiveServices(),
      ]);
      const subtotalKobo = items.reduce((sum, item) => sum + item.priceKobo * item.quantity, 0);
      return Response.json({ items, subtotalKobo, services });
    },

    PUT: async (request: Request, context: { params: Promise<{ serviceId: string }> }): Promise<Response> => {
      const userId = await dependencies.getUserId(request);
      if (!userId) return errorResponse("Sign in is required to update your cart.", 401);

      const { serviceId } = await context.params;
      const parsedServiceId = serviceIdSchema.safeParse(serviceId);
      if (!parsedServiceId.success) return errorResponse("Invalid service identifier.", 400);

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return errorResponse("Request body must be valid JSON.", 400);
      }
      const parsedBody = updateCartInputSchema.safeParse(body);
      if (!parsedBody.success) return errorResponse("Quantity must be an integer from 0 to 99.", 400);

      const { quantity } = parsedBody.data;
      if (quantity === 0) {
        await dependencies.removeItem(userId, serviceId);
      } else {
        const service = await dependencies.getService(serviceId);
        if (!service || !service.isActive) return errorResponse("This service is no longer available.", 404);
        await dependencies.setQuantity(userId, serviceId, quantity);
      }

      const [items, services] = await Promise.all([
        dependencies.listCart(userId),
        dependencies.listActiveServices(),
      ]);
      const subtotalKobo = items.reduce((sum, item) => sum + item.priceKobo * item.quantity, 0);
      return Response.json({ items, subtotalKobo, services });
    },

    DELETE: async (request: Request): Promise<Response> => {
      const userId = await dependencies.getUserId(request);
      if (!userId) return errorResponse("Sign in is required to clear your cart.", 401);
      await dependencies.clearCart(userId);
      const services = await dependencies.listActiveServices();
      return Response.json({ items: [], subtotalKobo: 0, services });
    },
  };
}