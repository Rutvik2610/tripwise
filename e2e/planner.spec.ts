import { test, expect } from "@playwright/test";
const navigate = async (
  page: import("@playwright/test").Page,
  name: string,
) => {
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name, exact: true })
    .click();
};
test("expense payments, hotel alternatives, scenario isolation, persistence and backups", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "A little planning. A great adventure.",
  );
  await navigate(page, "Expenses");
  await page.getByRole("button", { name: "Add expense", exact: true }).click();
  const modal = page.getByRole("dialog");
  await modal
    .getByLabel("Description", { exact: true })
    .fill("Airport snack test");
  await modal.getByLabel("Original amount", { exact: true }).fill("400");
  await modal.getByLabel("Total payments (INR)", { exact: true }).fill("150");
  await modal
    .getByLabel("Booking status", { exact: true })
    .selectOption("Booked");
  await modal.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByText("Airport snack test", { exact: true }),
  ).toBeVisible();
  let raw = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tripwise.v1")!),
  );
  const current = raw.trips.find((t: { id: string }) => t.id === raw.activeId);
  expect(
    current.expenses.find(
      (e: { description: string }) => e.description === "Airport snack test",
    ),
  ).toMatchObject({ amount: 400, paid: 150, paymentStatus: "Partially Paid" });
  await page.reload();
  await navigate(page, "Expenses");
  await expect(
    page.getByText("Airport snack test", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add expense", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Description", { exact: true })
    .fill("Invalid refund");
  await page
    .getByRole("dialog")
    .getByLabel("Total refunds (INR)", { exact: true })
    .fill("100");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save changes" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Refund cannot exceed payment",
  );
  await page.keyboard.press("Escape");
  await navigate(page, "Hotels");
  const malibest = page.locator(".hotel-card").filter({
    has: page.getByRole("heading", { name: "Malibest Resort", exact: true }),
  });
  await malibest
    .getByRole("button", { name: "Select stay", exact: true })
    .click();
  await expect(malibest).toContainText("Selected stay");
  raw = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tripwise.v1")!),
  );
  expect(
    raw.trips
      .find((t: { id: string }) => t.id === raw.activeId)
      .hotels.filter(
        (h: { destination: string; selected: boolean }) =>
          h.destination === "Langkawi" && h.selected,
      ),
  ).toHaveLength(1);
  await page
    .getByLabel("Active trip", { exact: true })
    .selectOption({ label: "Malaysia only · Three islands & cities" });
  await expect(
    page.getByRole("button", { name: "Penang", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Active trip", { exact: true })
    .selectOption({ label: "Malaysia + Singapore Solo Trip 2027" });
  await expect(malibest).toContainText("Selected stay");
  await navigate(page, "Itinerary");
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  await expect(page.locator(".calendar-grid")).toBeVisible();
  await page.getByRole("button", { name: "Add activity", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Activity name", { exact: true })
    .fill("A quiet coffee");
  await page
    .getByRole("dialog")
    .getByLabel("Estimated cost (INR)", { exact: true })
    .fill("250");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save changes" })
    .click();
  await expect(
    page.getByRole("heading", { name: "A quiet coffee", exact: true }),
  ).toBeVisible();
  await navigate(page, "Budget simulator");
  const food = page.getByRole("spinbutton", {
    name: "Daily food allowance",
    exact: true,
  });
  await food.fill("1500");
  await expect(page.locator(".simulation-total")).toContainText("CUSTOM");
  await navigate(page, "Compare trips");
  await expect(
    page.getByRole("heading", { name: "See the whole picture" }),
  ).toBeVisible();
  await expect(page.locator(".comparison-card")).toHaveCount(2);
  await navigate(page, "Checklist");
  const passport = page.locator(".checklist-full article").filter({
    has: page.getByRole("heading", {
      name: "Passport validity",
      exact: true,
    }),
  });
  await passport
    .getByRole("button", { name: "Mark Passport validity done", exact: true })
    .click();
  await expect(passport).toContainText("Done");
  await page
    .getByRole("button", { name: "Settings & backups", exact: true })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export all trips", exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/tripwise-backup-.*\.json/);
  await download.saveAs("/tmp/tripwise-e2e-backup.json");
  const before = await page.evaluate(() => localStorage.getItem("tripwise.v1"));
  await page.getByLabel("Import JSON backup", { exact: true }).setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":999}'),
  });
  await expect(page.getByRole("status")).toContainText("Import failed");
  expect(await page.evaluate(() => localStorage.getItem("tripwise.v1"))).toBe(
    before,
  );
  page.once("dialog", (d) => d.accept());
  await page
    .getByLabel("Import JSON backup", { exact: true })
    .setInputFiles("/tmp/tripwise-e2e-backup.json");
  await expect(page.getByRole("status")).toContainText(
    "Backup restored successfully",
  );
  await page
    .getByRole("button", { name: "Switch to dark theme", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(errors).toEqual([]);
});
test("mobile navigation and screens fit a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  for (const name of [
    "Overview",
    "Expenses",
    "Hotels",
    "Transportation",
    "Itinerary",
    "Budget simulator",
    "Compare trips",
    "Checklist",
  ]) {
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    await navigate(page, name);
    await page.waitForTimeout(250);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      name + " should fit mobile",
    ).toBe(true);
  }
  await page.screenshot({
    path: "/tmp/tripwise-mobile-checked.png",
    fullPage: true,
  });
});
test("future trip creation, hotel taxes, transport components, and trip lifecycle", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "My trips", exact: true }).click();
  await page.getByRole("button", { name: "Create trip", exact: true }).click();
  let modal = page.getByRole("dialog");
  await modal.getByLabel("Trip name", { exact: true }).fill("February escape");
  await modal.getByLabel("Start date", { exact: true }).fill("2027-02-01");
  await modal.getByLabel("End date", { exact: true }).fill("2027-02-04");
  await modal.getByLabel("Budget (INR)", { exact: true }).fill("50000");
  await modal.getByRole("button", { name: "Save changes" }).click();
  await navigate(page, "Itinerary");
  await page
    .getByRole("button", { name: "Add destination", exact: true })
    .click();
  modal = page.getByRole("dialog");
  await modal.getByLabel("Destination", { exact: true }).fill("Kuala Lumpur");
  await modal.getByLabel("Country", { exact: true }).fill("Malaysia");
  await modal.getByLabel("Arrival", { exact: true }).fill("2027-02-01");
  await modal.getByLabel("Departure", { exact: true }).fill("2027-02-04");
  await modal.getByRole("button", { name: "Save changes" }).click();
  await navigate(page, "Transportation");
  await page
    .getByRole("button", { name: "Add transport", exact: true })
    .click();
  modal = page.getByRole("dialog");
  await modal
    .getByLabel("Source / airport code", { exact: true })
    .fill("Mumbai (BOM)");
  await modal
    .getByLabel("Destination / airport code", { exact: true })
    .fill("Kuala Lumpur (KUL)");
  await modal
    .getByLabel("Original currency", { exact: true })
    .selectOption("MYR");
  await expect(
    modal.getByLabel("INR per currency unit", { exact: true }),
  ).toHaveValue("19");
  await modal.getByLabel("Base fare", { exact: true }).fill("100");
  await modal.getByLabel("Taxes", { exact: true }).fill("10");
  await modal.getByLabel("Baggage charges", { exact: true }).fill("5");
  await modal.getByLabel("Seat selection charges", { exact: true }).fill("5");
  await modal
    .getByLabel("Booking status", { exact: true })
    .selectOption("Booked");
  await modal.getByLabel("Total payments (INR)", { exact: true }).fill("1000");
  await modal.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".transport-price")).toContainText("₹2,280");
  await navigate(page, "Hotels");
  await page.getByRole("button", { name: "Add hotel", exact: true }).click();
  modal = page.getByRole("dialog");
  await modal
    .getByLabel("Hotel name", { exact: true })
    .fill("Test future hotel");
  await modal
    .getByLabel("Original currency", { exact: true })
    .selectOption("MYR");
  await modal.getByLabel("Price per night", { exact: true }).fill("100");
  await modal
    .getByLabel("Displayed price tax model", { exact: true })
    .selectOption("Separate");
  await modal
    .getByLabel("General taxes & fees (whole stay)", { exact: true })
    .fill("20");
  await modal
    .getByLabel("Other fees at property (whole stay)", { exact: true })
    .fill("10");
  await modal
    .getByLabel("Booking status", { exact: true })
    .selectOption("Booked");
  await modal.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".hotel-card")).toContainText("₹6,270");
  await expect(page.locator(".hotel-card")).toContainText("Selected stay");
  await navigate(page, "Overview");
  await expect(
    page.locator(".stat-card").filter({ hasText: "ESTIMATED TRIP COST" }),
  ).toContainText("₹8,550");
  await expect(
    page.locator(".stat-card").filter({ hasText: "ACTUALLY PAID" }),
  ).toContainText("₹1,000");
  await page.getByRole("button", { name: "My trips", exact: true }).click();
  const card = page.locator(".trip-card").filter({
    has: page.getByRole("heading", { name: "February escape", exact: true }),
  });
  await card.getByRole("button", { name: "Archive trip", exact: true }).click();
  await expect(card).toContainText("Archived");
  await card.getByRole("button", { name: "Restore trip", exact: true }).click();
  await card
    .getByRole("button", { name: "Duplicate February escape", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "February escape (copy)", exact: true }),
  ).toBeVisible();
  const copy = page.locator(".trip-card").filter({
    has: page.getByRole("heading", {
      name: "February escape (copy)",
      exact: true,
    }),
  });
  page.once("dialog", (d) => d.accept());
  await copy
    .getByRole("button", { name: "Delete February escape (copy)", exact: true })
    .click();
  await expect(copy).toHaveCount(0);
  await expect(card).toBeVisible();
});

test("three-night property taxes, included general tax, and violet dark theme", async ({
  page,
}) => {
  await page.goto("/");
  await navigate(page, "Hotels");
  await page.getByRole("button", { name: "Add hotel", exact: true }).click();
  const modal = page.getByRole("dialog");
  await modal
    .getByLabel("Hotel name", { exact: true })
    .fill("Three-night tax check");
  await modal.getByLabel("Price per night", { exact: true }).fill("1000");
  await modal.getByLabel("Check-in", { exact: true }).fill("2027-01-21");
  await modal.getByLabel("Check-out", { exact: true }).fill("2027-01-24");
  await modal
    .getByLabel("General taxes & fees (whole stay)", { exact: true })
    .fill("300");
  await modal
    .getByLabel("Tourism tax (paid at hotel)", { exact: true })
    .fill("30");
  await modal
    .getByLabel("Heritage tax (paid at hotel)", { exact: true })
    .fill("15");
  await expect(
    modal.getByLabel("Tourism & heritage tax basis", { exact: true }),
  ).toHaveValue("Whole stay");
  const preview = modal.getByRole("region", { name: "Hotel cost preview" });
  await expect(preview).toContainText("3 nights");
  await expect(preview).toContainText("₹3,345");
  await expect(preview).toContainText("₹45");
  await modal
    .getByLabel("Displayed price tax model", { exact: true })
    .selectOption("Included");
  await expect(
    modal.getByLabel("General taxes & fees (whole stay)", { exact: true }),
  ).toBeDisabled();
  await expect(preview).toContainText("₹3,045");
  await modal
    .getByLabel("Displayed price tax model", { exact: true })
    .selectOption("Separate");
  await modal.getByRole("button", { name: "Save changes" }).click();
  const hotel = page.locator(".hotel-card").filter({
    has: page.getByRole("heading", {
      name: "Three-night tax check",
      exact: true,
    }),
  });
  await expect(hotel).toContainText("₹3,345");
  await expect(hotel).toContainText("Payable in person at hotel");
  await expect(hotel).toContainText("₹45");
  await page.getByRole("button", { name: "Toggle theme", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(
    await page
      .locator("html")
      .evaluate((e) => getComputedStyle(e).getPropertyValue("--bg").trim()),
  ).toBe("#141625");
  await page.screenshot({
    path: "/tmp/tripwise-violet-hotels.png",
    fullPage: true,
  });
  await page.reload();
  await navigate(page, "Hotels");
  await expect(
    page.locator(".hotel-card").filter({
      has: page.getByRole("heading", {
        name: "Three-night tax check",
        exact: true,
      }),
    }),
  ).toContainText("₹3,345");
});
