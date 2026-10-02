import { z } from "zod";

import { formatNaira } from "../catalog";

const mailgunEnvSchema = z.object({
  MAILGUN_API_KEY: z.string().min(1),
  MAILGUN_DOMAIN: z.string().min(1),
  MAILGUN_FROM: z.string().min(1),
  MAILGUN_API_BASE_URL: z.string().url().optional(),
});

export const DEFAULT_MAILGUN_API_BASE_URL = "https://api.mailgun.net";

export function getMailgunApiBaseUrl(value: string | undefined): string {
  return (value || DEFAULT_MAILGUN_API_BASE_URL).replace(/\/+$/, "");
}

export type ConfirmationOrder = {
  orderNumber: string;
  customerName: string;
  fulfillmentType: "pickup" | "delivery";
  preferredDate: string;
  customerPhone: string;
  deliveryAddress: string | null;
  customerNote: string | null;
  totalKobo: number;
  items: Array<{
    serviceName: string;
    unitLabel: string;
    unitPriceKobo: number;
    quantity: number;
    lineTotalKobo: number;
  }>;
};

export type OrderConfirmationEmail = {
  to: string;
  order: ConfirmationOrder;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

function buildPlainText({ order }: OrderConfirmationEmail): string {
  const itemLines = order.items.map((item) =>
    `${item.serviceName} - ${item.quantity} x ${formatNaira(item.unitPriceKobo / 100)} (${item.unitLabel}): ${formatNaira(item.lineTotalKobo / 100)}`,
  );
  const fulfillment = order.fulfillmentType === "pickup" ? "Shop pickup" : "Delivery";
  const details = [
    `Collection: ${fulfillment}`,
    `Preferred date: ${order.preferredDate}`,
    `Phone: ${order.customerPhone}`,
    ...(order.deliveryAddress ? [`Delivery address: ${order.deliveryAddress}`] : []),
    ...(order.customerNote ? [`Note: ${order.customerNote}`] : []),
  ];

  return [
    `Hello ${order.customerName},`,
    "",
    "Uncle Halemaah has received your order request.",
    `Order number: ${order.orderNumber}`,
    "",
    "Items:",
    ...itemLines,
    "",
    `Total: ${formatNaira(order.totalKobo / 100)}`,
    ...details,
    "",
    "Your preferred date is a request and will be confirmed by the shop. No online payment has been collected.",
    "",
    "Thank you for choosing Uncle Halemaah. We look forward to caring for your clothes!",
  ].join("\n");
}

function buildHtml({ order }: OrderConfirmationEmail): string {
  const itemRows = order.items.map((item) => `
    <tr>
      <td style="padding:12px 8px;border-bottom:1px solid #e7e9e4;color:#20382d;">
        <strong>${escapeHtml(item.serviceName)}</strong><br>
        <span style="color:#64716b;font-size:13px;">${item.quantity} x ${escapeHtml(formatNaira(item.unitPriceKobo / 100))} / ${escapeHtml(item.unitLabel.toLowerCase())}</span>
      </td>
      <td style="padding:12px 8px;border-bottom:1px solid #e7e9e4;text-align:right;white-space:nowrap;color:#173d2f;">
        ${escapeHtml(formatNaira(item.lineTotalKobo / 100))}
      </td>
    </tr>`).join("");
  const fulfillment = order.fulfillmentType === "pickup" ? "Shop pickup" : "Delivery";
  const extraDetails = [
    ...(order.deliveryAddress ? [`<tr><td style="padding:7px 0;color:#64716b;">Delivery address</td><td style="padding:7px 0;text-align:right;color:#20382d;">${escapeHtml(order.deliveryAddress)}</td></tr>`] : []),
    ...(order.customerNote ? [`<tr><td style="padding:7px 0;color:#64716b;">Note</td><td style="padding:7px 0;text-align:right;color:#20382d;">${escapeHtml(order.customerNote)}</td></tr>`] : []),
  ].join("");

  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:24px 12px;background:#f4efe9;font-family:Arial,Helvetica,sans-serif;color:#20382d;">
    <div style="max-width:600px;margin:0 auto;background:#fffdf9;border:1px solid #e5e5df;border-radius:12px;overflow:hidden;">
      <header style="padding:24px;background:#173d2f;color:#fff;">
        <p style="margin:0 0 8px;color:#f6e3b3;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Order request received</p>
        <h1 style="margin:0;font-size:24px;line-height:1.25;">Uncle Halemaah</h1>
      </header>
      <main style="padding:24px 20px;">
        <p style="margin:0 0 8px;">Hello ${escapeHtml(order.customerName)},</p>
        <p style="margin:0 0 20px;color:#64716b;line-height:1.6;">Thanks for choosing us. We have received your request and the shop will review your preferred date.</p>
        <p style="margin:0 0 12px;font-weight:bold;">Order ${escapeHtml(order.orderNumber)}</p>
        <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead><tr><th style="padding:8px;text-align:left;border-bottom:2px solid #173d2f;">Item</th><th style="padding:8px;text-align:right;border-bottom:2px solid #173d2f;">Amount</th></tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
        <p style="display:flex;justify-content:space-between;gap:12px;margin:0;padding:16px 8px;border-bottom:1px solid #e7e9e4;font-weight:bold;">
          <span>Total</span><span>${escapeHtml(formatNaira(order.totalKobo / 100))}</span>
        </p>
        <h2 style="margin:24px 0 8px;font-size:16px;">Collection details</h2>
        <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:7px 0;color:#64716b;">Fulfillment</td><td style="padding:7px 0;text-align:right;color:#20382d;">${fulfillment}</td></tr>
          <tr><td style="padding:7px 0;color:#64716b;">Preferred date</td><td style="padding:7px 0;text-align:right;color:#20382d;">${escapeHtml(order.preferredDate)}</td></tr>
          <tr><td style="padding:7px 0;color:#64716b;">Phone</td><td style="padding:7px 0;text-align:right;color:#20382d;">${escapeHtml(order.customerPhone)}</td></tr>
          ${extraDetails}
        </table>
        <p style="margin:20px 0 0;padding:12px;background:#f8f0e5;border-radius:8px;color:#52615a;font-size:13px;line-height:1.5;">Your preferred date is not confirmed until the shop reviews your request. No online payment has been collected.</p>
        <p style="margin:20px 0 0;line-height:1.6;">Thank you for choosing Uncle Halemaah. We look forward to caring for your clothes!</p>
      </main>
    </div>
  </body>
</html>`;
}

export async function sendOrderConfirmationEmail(
  message: OrderConfirmationEmail,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const config = mailgunEnvSchema.safeParse(process.env);
  if (!config.success) throw new Error("Mailgun configuration is missing or invalid.");

  const { MAILGUN_API_KEY, MAILGUN_DOMAIN, MAILGUN_FROM, MAILGUN_API_BASE_URL } = config.data;
  const form = new FormData();
  form.set("from", MAILGUN_FROM);
  form.set("to", message.to);
  form.set("subject", `Order request received: ${message.order.orderNumber}`);
  form.set("text", buildPlainText(message));
  form.set("html", buildHtml(message));

  const apiBaseUrl = getMailgunApiBaseUrl(MAILGUN_API_BASE_URL);
  const response = await fetcher(`${apiBaseUrl}/v3/${encodeURIComponent(MAILGUN_DOMAIN)}/messages`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString("base64")}`,
    },
    body: form,
  });

  if (!response.ok) throw new Error(`Mailgun request failed with status ${response.status}.`);
}