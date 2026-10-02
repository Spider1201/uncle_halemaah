ALTER TABLE "orders" ADD COLUMN "customer_name" text;
--> statement-breakpoint
UPDATE "orders" AS order_row
SET "customer_name" = COALESCE(NULLIF(BTRIM(users.name), ''), users.email, 'Customer')
FROM "users"
WHERE users.id = order_row.user_id;
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "customer_name" SET NOT NULL;