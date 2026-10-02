import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_MAILGUN_API_BASE_URL,
  getMailgunApiBaseUrl,
  sendOrderConfirmationEmail,
  type ConfirmationOrder,
} from "../lib/email/mailgun";

afterEach(() => {
  vi.unstubAllEnvs();
});

const savedOrder: ConfirmationOrder = {
  orderNumber: "UH-ORDER1234",
  customerName: "A Customer",
  fulfillmentType: "delivery",
  preferredDate: "2026-10-05",
  customerPhone: "+234 801 234 5678",
  deliveryAddress: "12 Market Road",
  customerNote: "Please handle <silk> carefully",
  totalKobo: 360000,
  items: [{
    serviceName: "Shirt Care",
    unitLabel: "Per item",
    unitPriceKobo: 180000,
    quantity: 2,
    lineTotalKobo: 360000,
  }],
};

describe("sendOrderConfirmationEmail", () => {
  it("defaults to the US Mailgun endpoint", () => {
    expect(getMailgunApiBaseUrl(undefined)).toBe(DEFAULT_MAILGUN_API_BASE_URL);
  });

  it("sends a mobile-friendly HTML and plain-text confirmation through the configured EU endpoint", async () => {
    vi.stubEnv("MAILGUN_API_KEY", "test-api-key-not-for-use");
    vi.stubEnv("MAILGUN_DOMAIN", "mg.example.test");
    vi.stubEnv("MAILGUN_FROM", "Uncle Halemaah <orders@example.test>");
    vi.stubEnv("MAILGUN_API_BASE_URL", "https://api.eu.mailgun.net/");
    const mockedFetch = vi.fn(async () => new Response(null, { status: 200 }));

    await sendOrderConfirmationEmail({
      to: "google-account@example.test",
      order: savedOrder,
    }, mockedFetch);

    expect(mockedFetch).toHaveBeenCalledTimes(1);
    const [url, request] = mockedFetch.mock.calls[0];
    expect(url).toBe("https://api.eu.mailgun.net/v3/mg.example.test/messages");
    expect(request?.method).toBe("POST");
    const form = request?.body as FormData;
    expect(form.get("from")).toBe("Uncle Halemaah <orders@example.test>");
    expect(form.get("to")).toBe("google-account@example.test");
    expect(form.get("subject")).toContain("UH-ORDER1234");
    expect(form.get("text")).toContain("Hello A Customer,");
    expect(form.get("text")).toContain("₦3,600");
    expect(form.get("text")).toContain("Delivery address: 12 Market Road");
    expect(form.get("html")).toContain("<meta");
    expect(form.get("html")).toContain("&lt;silk&gt;");
    expect(form.get("html")).toContain("Hello A Customer,");
    expect(form.get("html")).toContain("2026-10-05");
  });
});