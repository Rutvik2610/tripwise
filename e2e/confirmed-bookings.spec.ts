import { test, expect } from "@playwright/test";
const navigate = async (page: import("@playwright/test").Page, name: string) =>
  page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name, exact: true })
    .click();

test("confirmed bookings reconcile once, use correct airports and retain ticket-issuance uncertainty", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("flights-total")).toHaveText("₹59,250");
  await expect(page.getByTestId("total-paid")).toHaveText("₹1,07,639");
  await expect(page.getByTestId("selected-hotels-total")).toHaveText("₹49,700");
  await expect(page.getByTestId("total-trip-cost")).toHaveText("₹1,60,050");
  await expect(page.getByTestId("remaining-budget")).toHaveText("₹5,050");
  await expect(page.getByTestId("confirmed-unpaid")).toHaveText("₹1,311");
  await expect(page.getByTestId("booking-reconciliation")).toContainText(
    "Outstanding hotel charges: 69 MYR",
  );
  await navigate(page, "Transportation");
  await expect(page.getByTestId("transport-total")).toHaveText("₹64,250");
  await expect(page.locator(".transport-list > .transport-card")).toHaveCount(
    5,
  );
  await expect(
    page.getByText("Ticket issuance: Awaiting ticketing", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("known-airfare-subtotal")).toHaveCount(0);
  const connection = page
    .locator(".transport-list > .transport-card")
    .filter({ hasText: "SQ108" });
  await expect(connection).toContainText("Kuala Lumpur (KUL)");
  await expect(connection).toContainText("Checked baggage: 30 kg");
  await expect(connection).not.toContainText("SZB");
  await expect(
    page.getByRole("combobox", { name: "Return flight option" }),
  ).toHaveCount(0);
  await navigate(page, "Hotels");
  await page.getByRole("button", { name: "Kuala Lumpur", exact: true }).click();
  const kl = page.locator(".hotel-card").filter({
    has: page.getByRole("heading", {
      name: "Easy Hotel KL Sentral",
      exact: true,
    }),
  });
  await expect(kl).toContainText("30 MYR ≈ ₹570");
  await expect(kl).toContainText("Partially Paid / Booked");
  const sg = page.locator(".hotel-card").filter({
    has: page.getByRole("heading", { name: "Hotel 81 Dickson", exact: true }),
  });
  await page.getByRole("button", { name: "Singapore", exact: true }).click();
  await expect(sg).toContainText("Paid / Booked");
  await page.reload();
  await navigate(page, "Overview");
  await expect(page.getByTestId("total-paid")).toHaveText("₹1,07,639");
});

test("property rate recalculation and settlement preserve fixed INR payments and forecast accounting", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Settings & backups", exact: true })
    .click();
  await page.getByLabel("INR per MYR", { exact: true }).fill("25");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", {
      name: "Recalculate unpaid planning estimates",
      exact: true,
    })
    .click();
  await navigate(page, "Overview");
  await expect(page.getByTestId("total-paid")).toHaveText("₹1,07,639");
  await expect(page.getByTestId("total-trip-cost")).toHaveText("₹1,60,464");
  await expect(page.getByTestId("confirmed-unpaid")).toHaveText("₹1,725");
  await navigate(page, "Hotels");
  await page.getByRole("button", { name: "Kuala Lumpur", exact: true }).click();
  const kl = page.locator(".hotel-card").filter({
    has: page.getByRole("heading", {
      name: "Easy Hotel KL Sentral",
      exact: true,
    }),
  });
  await kl.getByRole("button", { name: "Edit record", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByLabel("Fixed booking total paid/quoted (INR)", { exact: true }),
  ).toHaveValue("9210");
  await dialog.getByLabel("Amount paid (INR)", { exact: true }).fill("9960");
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await navigate(page, "Overview");
  await expect(page.getByTestId("total-trip-cost")).toHaveText("₹1,60,464");
  await expect(page.getByTestId("total-paid")).toHaveText("₹1,08,389");
  await expect(page.getByTestId("booking-reconciliation")).toContainText(
    "Outstanding hotel charges: 39 MYR",
  );
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tripwise.v1")!),
  );
  expect(data.trips[0].expenses).toHaveLength(6);
  await page
    .getByRole("button", { name: "Settings & backups", exact: true })
    .click();
  page.once("dialog", (d) => d.accept());
  await page.getByLabel("Import JSON backup", { exact: true }).setInputFiles({
    name: "TEST-roundtrip.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await navigate(page, "Overview");
  await expect(page.getByTestId("total-paid")).toHaveText("₹1,08,389");
  await page
    .getByRole("button", { name: "Settings & backups", exact: true })
    .click();
  await page.getByLabel("INR per MYR", { exact: true }).fill("30");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", {
      name: "Recalculate unpaid planning estimates",
      exact: true,
    })
    .click();
  await navigate(page, "Overview");
  await expect(page.getByTestId("total-paid")).toHaveText("₹1,08,389");
  await expect(page.getByTestId("total-trip-cost")).toHaveText("₹1,60,659");
  await expect(page.getByTestId("confirmed-unpaid")).toHaveText("₹1,170");
});

test("all revised sightseeing days display correctly with arrival buffers, CNY caveats and mobile fit", async ({
  page,
}) => {
  await page.goto("/");
  await navigate(page, "Itinerary");
  const itinerary = [
    ["28 Jan", "KUL arrivals and transfer to Easy Hotel KL Sentral"],
    ["29 Jan", "Batu Caves"],
    ["30 Jan", "Aquaria KLCC"],
    ["31 Jan", "Langkawi arrival and Nadias Hotel check-in"],
    ["1 Feb", "SkyCab"],
    ["2 Feb", "Guided ATV adventure"],
    ["3 Feb", "Changi arrival, immigration and baggage"],
    ["4 Feb", "Universal Studios Singapore"],
    ["5 Feb", "Singapore Oceanarium"],
    ["6 Feb", "Bugis Street Market and Bugis Junction"],
    ["7 Feb", "Jewel Changi — Rain Vortex and shopping"],
  ];
  for (const [date, title] of itinerary) {
    await page.locator(".day-tabs button").filter({ hasText: date }).click();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toHaveCount(1);
  }
  await page.locator(".day-tabs button").filter({ hasText: "3 Feb" }).click();
  const arrival = page.locator(".activity").filter({
    has: page.getByRole("heading", {
      name: "Changi arrival, immigration and baggage",
      exact: true,
    }),
  });
  await expect(arrival).toContainText("14:25");
  await expect(
    page.getByText("Travel: Langkawi (LGK) → Singapore Changi (SIN)", {
      exact: true,
    }),
  ).toHaveCount(1);
  await page.locator(".day-tabs button").filter({ hasText: "6 Feb" }).click();
  const bugis = page.locator(".activity").filter({
    has: page.getByRole("heading", {
      name: "Bugis Street Market and Bugis Junction",
      exact: true,
    }),
  });
  await bugis.locator("summary").click();
  await expect(bugis).toContainText("Chinese New Year");
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Bugis Street Market and Bugis Junction",
      exact: true,
    }),
  ).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/tripwise-confirmed-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByLabel("Active trip", { exact: true })
    .selectOption({ label: "Malaysia only · Three islands & cities" });
  await navigate(page, "Overview");
  await expect(page.getByTestId("total-trip-cost")).toHaveText("₹1,43,259");
});
