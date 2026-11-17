import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Store } from "../src/lib/model";
const oldSnapshot = JSON.parse(
  readFileSync(
    new URL("../src/data/published-trip-data.json", import.meta.url),
    "utf8",
  ),
) as Store;
const navigate = async (page: import("@playwright/test").Page, name: string) =>
  page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name, exact: true })
    .click();

test("both live default scenarios use the February plan and preserve all original hotel fields", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  let data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tripwise.v1")!),
  );
  for (let i = 0; i < 2; i++) {
    expect(data.trips[i]).toMatchObject({
      start: "2027-01-23",
      end: "2027-02-03",
      plannedNights: 10,
      february2027Revision: 1,
    });
    expect(data.trips[i].hotels).toEqual(
      oldSnapshot.trips[i].hotels.map((h) => {
        const shift = (date: string) => {
          const d = new Date(date + "T00:00:00Z");
          d.setUTCDate(d.getUTCDate() + 7);
          return d.toISOString().slice(0, 10);
        };
        return { ...h, checkIn: shift(h.checkIn), checkOut: shift(h.checkOut) };
      }),
    );
  }
  await expect(
    page.getByText("Accommodation dates need review.", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByTestId("flights-total")).toHaveText("₹46,140");
  await navigate(page, "Transportation");
  await expect(page.getByTestId("known-airfare-subtotal")).toContainText(
    "₹41,194",
  );
  await expect(page.getByTestId("transport-total")).toHaveText("₹51,140");
  const outgoing = page
    .locator(".transport-card")
    .filter({ hasText: "SQ 8584" });
  await expect(outgoing).toContainText("Kuala Lumpur Subang (SZB)");
  await expect(outgoing).toContainText("Scoot");
  await expect(outgoing).toContainText("13:10");
  const first = page.locator(".transport-card").filter({ hasText: "SQ 423" });
  await expect(first).toContainText("Checked baggage: 25 kg");
  await expect(
    page.getByRole("heading", {
      name: "Singapore Changi (SIN) — outbound connection",
      exact: true,
    }),
  ).toHaveCount(0);
  const domestic = page
    .locator(".transport-card")
    .filter({ hasText: "AK 6324" });
  await expect(domestic).toContainText("₹3,482");
  await expect(domestic).toContainText("Kuala Lumpur (KUL)");
  await expect(domestic).toContainText("12:55");
  await page
    .getByLabel("Active trip", { exact: true })
    .selectOption({ label: "Malaysia only · Three islands & cities" });
  await expect(page.getByTestId("transport-total")).toHaveText("₹49,762");
  await expect(
    page.getByText(/Comparison only — excluded from forecast/),
  ).toBeVisible();
  await expect(
    page.getByText("Older estimate — requote needed", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Singapore return transit — reconfirmation required",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".suggested-transit")).toHaveCount(0);
  await navigate(page, "Itinerary");
  await expect(
    page.getByText("Accommodation dates need review.", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText(
      "Travel: Singapore Changi (SIN) → Kuala Lumpur Subang (SZB)",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Connecting outbound ticket",
      exact: true,
    }),
  ).toHaveCount(0);
  data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tripwise.v1")!),
  );
  await page.reload();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("tripwise.v1")!)),
  ).toEqual(data);
  expect(errors).toEqual([]);
});

test("return alternatives count once, can be switched and preserve unknown Option B baggage", async ({
  page,
}) => {
  await page.goto("/");
  await navigate(page, "Transportation");
  const choice = page.getByRole("combobox", { name: "Return flight option" });
  await expect(choice.locator("option:checked")).toContainText("AI 2108");
  const cards = page.locator(".transport-list > .transport-card");
  await expect(cards).toHaveCount(5);
  const numbers = await cards
    .locator(".transport-route > small")
    .allTextContents();
  expect(
    numbers.map((text) => text.match(/(?:SQ|AK|AI) \d+/)?.[0] ?? "regional"),
  ).toEqual(["SQ 423", "SQ 8584", "AK 6324", "regional", "AI 2108"]);
  await expect(cards.last()).toContainText("Checked baggage: Unverified");
  const optionA = await choice
    .locator("option")
    .filter({ hasText: "AI 2106" })
    .getAttribute("value");
  const optionB = await choice.inputValue();
  await choice.selectOption(optionA!);
  await expect(cards.last().locator(".transport-route > small")).toContainText(
    "AI 2106",
  );
  await expect(page.getByTestId("transport-total")).toHaveText("₹51,140");
  await page.reload();
  await navigate(page, "Transportation");
  await expect(choice).toHaveValue(optionA!);
  await choice.selectOption(optionB);
  await expect(cards).toHaveCount(5);
  await expect(page.getByTestId("transport-total")).toHaveText("₹51,140");
  await navigate(page, "Itinerary");
  await expect(
    page.getByText("Travel: Singapore (SIN) → Mumbai (BOM)", { exact: true }),
  ).toHaveCount(1);
  await navigate(page, "Transportation");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/tripwise-february-mobile.png",
    fullPage: true,
  });
});

test("old localStorage updates once, preserves protected payments and hotel records, and reports conflicts", async ({
  page,
}) => {
  await page.goto("/");
  const original = structuredClone(oldSnapshot);
  original.trips[0].transport[3].paid = 500;
  original.trips[0].transport[3].reference = "KEEP-BOOKING";
  await page.evaluate(
    (value) => localStorage.setItem("tripwise.v1", JSON.stringify(value)),
    original,
  );
  await page.reload();
  const result = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tripwise.v1")!),
  );
  expect(
    result.trips[0].transport.find(
      (r: { id: string }) => r.id === original.trips[0].transport[3].id,
    ),
  ).toEqual(original.trips[0].transport[3]);
  expect(result.trips.map((t: { hotels: unknown }) => t.hotels)).toEqual(
    original.trips.map((t) => t.hotels),
  );
  await navigate(page, "Transportation");
  await expect(
    page.getByText(/SIN → BOM alternatives not applied/),
  ).toBeVisible();
  await page.reload();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("tripwise.v1")!)),
  ).toEqual(result);
  await page
    .getByRole("button", { name: "Settings & backups", exact: true })
    .click();
  page.once("dialog", (d) => d.accept());
  await page.getByLabel("Import JSON backup", { exact: true }).setInputFiles({
    name: "old.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(oldSnapshot)),
  });
  await expect(page.getByRole("status")).toContainText(
    "Backup restored successfully",
  );
  expect(
    (
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("tripwise.v1")!),
      )
    ).trips[0].start,
  ).toBe("2027-01-23");
});
