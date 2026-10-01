import { pgTable, uuid, text, timestamp, boolean, integer, pgEnum, uniqueIndex, primaryKey } from "drizzle-orm/pg-core";

export const orderStatusEnum = pgEnum("order_status", [
  "received",
  "confirmed",
  "in_progress",
  "ready",
  "completed",
  "cancelled",
]);

export const fulfillmentTypeEnum = pgEnum("fulfillment_type", ["pickup", "delivery"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  providerAccountUnique: uniqueIndex("provider_account_unique").on(table.provider, table.providerAccountId),
}));

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
}, (table) => ({
  tokenPrimaryKey: primaryKey({ columns: [table.identifier, table.token] }),
}));

export const services = pgTable("services", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  unitLabel: text("unit_label").notNull(),
  priceKobo: integer("price_kobo").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  status: orderStatusEnum("status").default("received").notNull(),
  fulfillmentType: fulfillmentTypeEnum("fulfillment_type").notNull(),
  customerPhone: text("customer_phone").notNull(),
  preferredDate: text("preferred_date").notNull(),
  deliveryAddress: text("delivery_address"),
  customerNote: text("customer_note"),
  subtotalKobo: integer("subtotal_kobo").notNull(),
  deliveryFeeKobo: integer("delivery_fee_kobo").default(0).notNull(),
  totalKobo: integer("total_kobo").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  serviceId: uuid("service_id").references(() => services.id),
  serviceName: text("service_name").notNull(),
  unitLabel: text("unit_label").notNull(),
  unitPriceKobo: integer("unit_price_kobo").notNull(),
  quantity: integer("quantity").notNull(),
  lineTotalKobo: integer("line_total_kobo").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
