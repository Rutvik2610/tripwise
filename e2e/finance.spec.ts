import { test, expect } from "@playwright/test";
const nav = async (page: import("@playwright/test").Page, name: string) =>
  page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name, exact: true })
    .click();
const addExpense = async (
  page: import("@playwright/test").Page,
  name: string,
) => {
  await nav(page, "Expenses");
  await page.getByRole("button", { name: "Add expense", exact: true }).click();
  const modal = page.getByRole("dialog");
  await modal.getByLabel("Description", { exact: true }).fill(name);
  return modal;
};

test("RM30 defaults to Spent, stores INR570, and snapshots survive global rate edits", async ({
  page,
}) => {
  await page.goto("/");
  const modal = await addExpense(page, "MYR lunch");
  await expect(
    modal.getByLabel("Spending status", { exact: true }),
  ).toHaveValue("Spent");
  await expect(modal.getByLabel("Booking status", { exact: true })).toHaveCount(
    0,
  );
  await modal
    .getByLabel("Original currency", { exact: true })
    .selectOption("MYR");
  await modal.getByLabel("Original amount", { exact: true }).fill("30");
  await expect(
    modal.getByLabel("Amount paid (MYR)", { exact: true }),
  ).toHaveValue("30");
  await expect(modal).toContainText("₹570.00");
  await modal.getByRole("button", { name: "Save changes" }).click();
  const row = page.getByRole("row").filter({ hasText: "MYR lunch" });
  await expect(row).toContainText("Spent");
  await expect(row).toContainText("₹570 net paid");
  await expect(row).toContainText("30 MYR");
  await page
    .getByLabel("Filter category", { exact: true })
    .selectOption("Food");
  await page.getByLabel("Filter status", { exact: true }).selectOption("Spent");
  await expect(row).toBeVisible();
  await page
    .getByRole("button", { name: "Settings & backups", exact: true })
    .click();
  await page.getByLabel("INR per MYR", { exact: true }).fill("25");
  await page.reload();
  await nav(page, "Expenses");
  await expect(row).toContainText("₹570 net paid");
  const record = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tripwise.v1")!).trips[0].expenses.find(
      (e: { description: string }) => e.description === "MYR lunch",
    ),
  );
  expect(record).toMatchObject({
    currency: "MYR",
    amount: 30,
    rate: 19,
    paid: 570,
    paymentSnapshot: { currency: "MYR", amount: 30, rate: 19 },
  });
  await nav(page, "Overview");
  await expect(page.getByTestId("total-paid")).toHaveText("₹570");
  await expect(page.getByTestId("total-trip-cost")).toHaveText("₹1,75,052");
});

test("explicit allowance spending consumes the target and reconciliation explains other costs", async ({
  page,
}) => {
  await page.goto("/");
  const modal = await addExpense(page, "Allowance lunch");
  await modal.getByLabel("Original amount", { exact: true }).fill("1000");
  const options = await modal
    .getByLabel("Budget source", { exact: true })
    .locator("option")
    .allTextContents();
  expect(options).toContain("Use allowance: Daily meals allowance");
  await modal
    .getByLabel("Budget source", { exact: true })
    .selectOption({ label: "Use allowance: Daily meals allowance" });
  await modal.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("row").filter({
      has: page.getByText("Daily meals allowance", { exact: true }),
    }),
  ).toContainText("Remaining allowance ₹13,500");
  await nav(page, "Overview");
  await expect(page.getByTestId("total-trip-cost")).toHaveText("₹1,74,482");
  await expect(page.getByTestId("total-paid")).toHaveText("₹1,000");
  await expect(page.getByTestId("remaining-forecast")).toHaveText("₹1,73,482");
  const panel = page.locator(".panel").filter({
    has: page.getByRole("heading", {
      name: "Budget reconciliation",
      exact: true,
    }),
  });
  await panel.getByRole("button", { name: "Source", exact: true }).click();
  await expect(panel).toContainText("Expense records contribute ₹33,200");
  await expect(panel).toContainText("Itinerary activities");
  await panel
    .locator("summary")
    .filter({ hasText: "Itinerary activities" })
    .click();
  await expect(panel).toContainText("Universal Studios Singapore");
  await panel
    .locator("summary")
    .filter({ hasText: "Budget allowance usage" })
    .click();
  await expect(panel).toContainText("1 linked items");
});

test("paying an existing estimate keeps the forecast constant; categories preserve distinct workflows", async ({
  page,
}) => {
  await page.goto("/");
  const modal = await addExpense(page, "Estimated shopping");
  await modal.getByLabel("Category", { exact: true }).selectOption("Shopping");
  await modal
    .getByLabel("Spending status", { exact: true })
    .selectOption("Estimated");
  await modal.getByLabel("Original amount", { exact: true }).fill("1000");
  await modal.getByRole("button", { name: "Save changes" }).click();
  const row = page.getByRole("row").filter({ hasText: "Estimated shopping" });
  await expect(row).toContainText("Estimated");
  await row.getByRole("button", { name: "Edit record", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Spending status", { exact: true })
    .selectOption("Spent");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save changes" })
    .click();
  await nav(page, "Overview");
  await expect(page.getByTestId("total-trip-cost")).toHaveText("₹1,75,482");
  await expect(page.getByTestId("total-paid")).toHaveText("₹1,000");
  const flight = await addExpense(page, "Flight workflow check");
  await flight
    .getByLabel("Category", { exact: true })
    .selectOption("International flights");
  await expect(
    flight.getByLabel("Booking status", { exact: true }),
  ).toBeVisible();
  await expect(
    flight.getByLabel("Spending status", { exact: true }),
  ).toHaveCount(0);
  await expect(
    flight.getByLabel("Amount paid (INR)", { exact: true }),
  ).toHaveValue("0");
});

test("activity payment is linked once and hotel defaults match the revised stays", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Accommodation dates need review.", { exact: true }),
  ).toHaveCount(0);
  await nav(page, "Itinerary");
  const activity = page.locator("article.activity").filter({
    has: page.getByRole("heading", { name: "SkyCab", exact: true }),
  });
  await activity
    .getByRole("button", { name: "Record payment", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save changes" })
    .click();
  await nav(page, "Overview");
  await expect(page.getByTestId("total-trip-cost")).toHaveText("₹1,74,482");
  await expect(page.getByTestId("total-paid")).toHaveText("₹1,800");
  await page.reload();
  await expect(page.getByTestId("total-paid")).toHaveText("₹1,800");
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tripwise.v1")!),
  );
  expect(
    data.trips[0].expenses.filter(
      (e: { plannedActivityId?: string }) => e.plannedActivityId,
    ),
  ).toHaveLength(1);
  await page
    .getByLabel("Active trip", { exact: true })
    .selectOption({ label: "Malaysia only · Three islands & cities" });
  await expect(
    page.getByText("Accommodation dates need review.", { exact: true }),
  ).toHaveCount(0);
  const malaysia = await page.evaluate(
    () => JSON.parse(localStorage.getItem("tripwise.v1")!).trips[1],
  );
  expect(
    malaysia.hotels.find(
      (h: { name: string }) => h.name === "Tune Hotel KLIA-KLIA2",
    ),
  ).toMatchObject({
    checkIn: "2027-02-02",
    checkOut: "2027-02-03",
    selected: true,
    nightly: 5302,
    taxes: 1948,
  });
});

test("legacy payments remain INR until explicitly corrected, and refunds keep their own rate", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tripwise.v1")!);
    s.trips[0].expenses.push({
      ...s.trips[0].expenses[0],
      id: "legacy-foreign",
      kind: "Item",
      description: "Legacy foreign meal",
      currency: "MYR",
      amount: 30,
      rate: 19,
      paid: 30,
    });
    localStorage.setItem("tripwise.v1", JSON.stringify(s));
  });
  await page.reload();
  await nav(page, "Expenses");
  const row = page.getByRole("row").filter({ hasText: "Legacy foreign meal" });
  await row.getByRole("button", { name: "Edit record", exact: true }).click();
  const modal = page.getByRole("dialog");
  await expect(modal).toContainText("This older payment was saved as INR");
  await expect(
    modal.getByLabel("Amount paid (INR)", { exact: true }),
  ).toHaveValue("30");
  await modal
    .getByLabel("Payment currency", { exact: true })
    .selectOption("MYR");
  await modal.getByLabel("Amount paid (MYR)", { exact: true }).fill("30");
  await modal
    .getByLabel("Refund currency", { exact: true })
    .selectOption("MYR");
  await modal.getByLabel("Refund rate (INR/MYR)", { exact: true }).fill("20");
  await modal.getByLabel("Amount refunded (MYR)", { exact: true }).fill("10");
  await modal.getByRole("button", { name: "Save changes" }).click();
  await expect(row).toContainText("₹370 net paid");
  await row.getByRole("button", { name: "Edit record", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Spending status", { exact: true })
    .selectOption("Cancelled");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save changes" })
    .click();
  await expect(row).toContainText("Cancelled");
  await row.getByRole("button", { name: "Edit record", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Spending status", { exact: true })
    .selectOption("Custom");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save changes" })
    .click();
  await expect(row).toContainText("Partially spent");
  await expect(row).toContainText("₹370 net paid");
});

test("editing an existing spent estimate preserves its actual payment until explicitly corrected", async ({
  page,
}) => {
  await page.goto("/");
  const modal = await addExpense(page, "Historical paid lunch");
  await modal.getByLabel("Original amount", { exact: true }).fill("1000");
  await modal.getByRole("button", { name: "Save changes" }).click();
  const row = page
    .getByRole("row")
    .filter({ hasText: "Historical paid lunch" });
  await row.getByRole("button", { name: "Edit record", exact: true }).click();
  const editor = page.getByRole("dialog");
  await editor.getByLabel("Original amount", { exact: true }).fill("1200");
  await expect(
    editor.getByLabel("Amount paid (INR)", { exact: true }),
  ).toHaveValue("1000");
  await editor.getByRole("button", { name: "Save changes" }).click();
  await expect(row).toContainText("Partially spent");
  await expect(row).toContainText("₹1,000 net paid");
});

test("financial dashboard and payment editor fit an iPhone-sized screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("remaining-forecast")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/tripwise-financial-default-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await nav(page, "Expenses");
  await page.getByRole("button", { name: "Add expense", exact: true }).click();
  const modal = page.getByRole("dialog");
  await modal
    .getByLabel("Original currency", { exact: true })
    .selectOption("MYR");
  await modal.getByLabel("Original amount", { exact: true }).fill("30");
  expect(await modal.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(
    true,
  );
  await page.screenshot({ path: "/tmp/tripwise-payment-mobile.png" });
  await modal
    .getByRole("button", { name: "Close editor", exact: true })
    .click();
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/");
  await expect(page.getByTestId("remaining-forecast")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
