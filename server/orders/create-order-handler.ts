import { randomUUID } from "node:crypto";
import { z } from "zod";

import type { ConfirmationOrder } from "@/lib/email/mailgun";

const MAX_POSTGRES_INTEGER = 2_147_483_647;

function isCalendarDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function getLagosDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const dateParts = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

export const createOrderInputSchema = z.object({
  items: z.array(z.object({
    serviceSlug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
    quantity: z.number().int().min(1).max(99),
  }).strict()).min(1).max(50),
  customerName: z.string().trim().min(2).max(120).refine((value) => !/[\u0000-\u001f\u007f]/.test(value)),
  fulfillmentType: z.enum(["pickup", "delivery"]),
  customerPhone: z.string().trim().min(7).max(30).regex(/^\+?[0-9\s()-]+$/),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isCalendarDate),
  deliveryAddress: z.string().trim().max(500).optional(),
  customerNote: z.string().trim().max(1000).optional(),
}).strict().superRefine((value, context) => {
  const slugs = value.items.map(({ serviceSlug }) => serviceSlug);
  if (new Set(slugs).size !== slugs.length) {
    context.addIssue({ code: "custom", path: ["items"], message: "Each service may only appear once." });
  }
  if (value.fulfillmentType === "delivery" && !value.deliveryAddress?.trim()) {
    context.addIssue({ code: "custom", path: ["deliveryAddress"], message: "Delivery address is required for delivery." });
  }
});

export type OrderServicePrice = {
  id: string;
  slug: string;
  name: string;
  unitLabel: string;
  priceKobo: number;
};

export type NewOrderRecord = {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  status: "received";
  fulfillmentType: "pickup" | "delivery";
  customerPhone: string;
  preferredDate: string;
  deliveryAddress: string | null;
  customerNote: string | null;
  subtotalKobo: number;
  deliveryFeeKobo: 0;
  totalKobo: number;
};

export type NewOrderItemRecord = {
  id: string;
  orderId: string;
  serviceId: string;
  serviceName: string;
  unitLabel: string;
  unitPriceKobo: number;
  quantity: number;
  lineTotalKobo: number;
};

type CreateOrderDependencies = {
  getIdentity: (request?: Request) => Promise<{ userId: string; email: string | null } | null>;
  getActiveServices: (slugs: string[]) => Promise<OrderServicePrice[]>;
  saveOrder: (order: NewOrderRecord, items: NewOrderItemRecord[]) => Promise<void>;
  clearCart?: (userId: string) => Promise<void>;
  getSavedOrder: (orderId: string, userId: string) => Promise<ConfirmationOrder | null>;
  sendConfirmationEmail: (message: { to: string; order: ConfirmationOrder }) => Promise<void>;
  getToday?: () => string;
  createId?: () => string;
  createOrderNumber?: () => string;
};

function jsonError(message: string, status: number, details?: unknown) {
  return Response.json({ error: message, ...(details ? { details } : {}) }, { status });
}

export function createOrderPostHandler(dependencies: CreateOrderDependencies) {
  return async function POST(request: Request): Promise<Response> {
    const identity = await dependencies.getIdentity(request);
    if (!identity) return jsonError("Sign in is required to place an order.", 401);
    const { userId } = identity;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Request body must be valid JSON.", 400);
    }

    const parsed = createOrderInputSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Check the order details and try again.", 400, parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })));
    }

    const { data } = parsed;
    if (!isCalendarDate(data.preferredDate) || data.preferredDate < (dependencies.getToday ?? getLagosDate)()) {
      return jsonError("Preferred date must be today or a future date in Lagos time.", 400);
    }

    const services = await dependencies.getActiveServices(data.items.map(({ serviceSlug }) => serviceSlug));
    const servicesBySlug = new Map(services.map((service) => [service.slug, service]));
    if (servicesBySlug.size !== data.items.length || data.items.some(({ serviceSlug }) => !servicesBySlug.has(serviceSlug))) {
      return jsonError("One or more selected services are unavailable. Refresh the catalog and try again.", 409);
    }

    const createId = dependencies.createId ?? randomUUID;
    const lineItems = data.items.map(({ serviceSlug, quantity }) => {
      const service = servicesBySlug.get(serviceSlug)!;
      return {
        id: createId(),
        orderId: "",
        serviceId: service.id,
        serviceName: service.name,
        unitLabel: service.unitLabel,
        unitPriceKobo: service.priceKobo,
        quantity,
        lineTotalKobo: service.priceKobo * quantity,
      };
    });
    const subtotalKobo = lineItems.reduce((total, item) => total + item.lineTotalKobo, 0);
    if (!Number.isSafeInteger(subtotalKobo) || subtotalKobo > MAX_POSTGRES_INTEGER) {
      return jsonError("Order total is outside the supported range.", 400);
    }

    const orderId = createId();
    const order: NewOrderRecord = {
      id: orderId,
      orderNumber: (dependencies.createOrderNumber ?? (() => `UH-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`))(),
      userId,
      customerName: data.customerName,
      status: "received",
      fulfillmentType: data.fulfillmentType,
      customerPhone: data.customerPhone,
      preferredDate: data.preferredDate,
      deliveryAddress: data.fulfillmentType === "delivery" ? data.deliveryAddress!.trim() : null,
      customerNote: data.customerNote?.trim() || null,
      subtotalKobo,
      deliveryFeeKobo: 0,
      totalKobo: subtotalKobo,
    };
    const orderItems = lineItems.map((item) => ({ ...item, orderId }));

    await dependencies.saveOrder(order, orderItems);
    if (dependencies.clearCart) {
      await dependencies.clearCart(userId);
    }

    if (identity.email) {
      try {
        const savedOrder = await dependencies.getSavedOrder(orderId, userId);
        if (!savedOrder) {
          console.error("Order confirmation email skipped: saved order could not be loaded for its owner.", { orderId });
        } else {
          await dependencies.sendConfirmationEmail({
            to: identity.email,
            order: savedOrder,
          });
        }
      } catch {
        console.error("Order confirmation email failed after the order was saved.", { orderId });
      }
    }

    return Response.json({
      orderNumber: order.orderNumber,
      status: order.status,
      subtotalKobo: order.subtotalKobo,
      totalKobo: order.totalKobo,
    }, { status: 201 });
  };
}