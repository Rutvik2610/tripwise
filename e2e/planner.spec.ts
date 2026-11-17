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
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const path = "/src/lib/seed.ts";
    const { publishedSnapshotSeed } = await import(path);
    const store = publishedSnapshotSeed();
    store.trips.forEach((t: { february2027Revision?: number }) => {
      t.february2027Revision = 1;
    });
    localStorage.setItem("tripwise.v1", JSON.stringify(store));
  });
  await page.reload();
  if ((await page.locator("html").getAttribute("data-theme")) === "dark")
    await page
      .getByRole("button", { name: "Toggle theme", exact: true })
      .click();
  await page
    .getByLabel("Active trip", { exact: true })
    .selectOption({ label: "Malaysia + Singapore Solo Trip 2027" });
});
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
    .fill("Reserved airport experience");
  await modal
    .getByLabel("Category", { exact: true })
    .selectOption("Attractions");
  await modal.getByLabel("Original amount", { exact: true }).fill("400");
  await modal.getByLabel("Amount paid (INR)", { exact: true }).fill("150");
  await modal
    .getByLabel("Booking status", { exact: true })
    .selectOption("Booked");
  await modal.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByText("Reserved airport experience", { exact: true }),
  ).toBeVisible();
  let raw = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tripwise.v1")!),
  );
  const current = raw.trips.find((t: { id: string }) => t.id === raw.activeId);
  expect(
    current.expenses.find(
      (e: { description: string }) =>
        e.description === "Reserved airport experience",
    ),
  ).toMatchObject({ amount: 400, paid: 150, paymentStatus: "Partially Paid" });
  await page.reload();
  await navigate(page, "Expenses");
  await expect(
    page.getByText("Reserved airport experience", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add expense", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Description", { exact: true })
    .fill("Invalid refund");
  await page
    .getByRole("dialog")
    .getByLabel("Amount refunded (INR)", { exact: true })
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
  await modal.getByLabel("Amount paid (INR)", { exact: true }).fill("1000");
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
  await expect(page.getByTestId("total-trip-cost")).toContainText("₹8,550");
  await expect(page.getByTestId("total-paid")).toContainText("₹1,000");
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
  await modal.getByLabel("Check-in", { exact: true }).fill("2027-01-20");
  await modal.getByLabel("Check-out", { exact: true }).fill("2027-01-23");
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

test("financial overview responds to selected hotels, sorting, and stay links", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("flights-total")).toHaveText("₹47,950");
  await expect(page.getByTestId("selected-hotels-total")).toHaveText("₹53,642");
  await expect(page.getByTestId("flights-hotels-total")).toHaveText(
    "₹1,01,592",
  );
  await expect(page.getByTestId("other-expenses-total")).toHaveText("₹74,700");
  await expect(page.getByTestId("total-trip-cost")).toHaveText("₹1,76,292");
  const kl = page.locator("tr").filter({
    has: page.getByRole("cell", { name: "Kuala Lumpur", exact: true }),
  });
  await kl
    .getByRole("button", { name: "Compare alternatives", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Kuala Lumpur · 3 nights" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Hotel 81 Dickson", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Sort hotels", { exact: true })).toHaveValue(
    "total",
  );
  const ancasa = page.locator(".hotel-card").filter({
    has: page.getByRole("heading", {
      name: "AnCasa Hotel Kuala Lumpur, Chinatown",
      exact: true,
    }),
  });
  const moxy = page.locator(".hotel-card").filter({
    has: page.getByRole("heading", {
      name: "Moxy Kuala Lumpur Chinatown",
      exact: true,
    }),
  });
  await moxy.getByRole("button", { name: "Select stay", exact: true }).click();
  await expect(ancasa).toContainText("₹2,871 less than selected stay");
  await ancasa
    .getByRole("button", { name: "Select stay", exact: true })
    .click();
  await navigate(page, "Overview");
  await expect(page.getByTestId("selected-hotels-total")).toHaveText("₹57,758");
  await expect(page.getByTestId("flights-hotels-total")).toHaveText(
    "₹1,05,708",
  );
  await expect(page.getByTestId("total-trip-cost")).toHaveText("₹1,80,408");
  await page.reload();
  await expect(page.getByTestId("selected-hotels-total")).toHaveText("₹57,758");
  await navigate(page, "Hotels");
  for (const dest of ["Kuala Lumpur", "Langkawi", "Singapore"]) {
    await page.getByRole("button", { name: dest, exact: true }).click();
    const selected = page.locator(".hotel-card.selected");
    await selected
      .getByRole("button", { name: "Deselect", exact: true })
      .click();
  }
  await navigate(page, "Overview");
  await expect(page.getByTestId("selected-hotels-total")).toHaveText("₹0");
  await expect(page.getByTestId("flights-hotels-total")).toHaveText("₹47,950");
  await expect(
    page.getByText("Partial — accommodation incomplete", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Selection pending", exact: true }),
  ).toHaveCount(3);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("total-trip-cost")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/tripwise-finance-mobile.png",
    fullPage: true,
  });
});

test("legacy data research review preserves paid and manually edited records", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tripwise.v1")!);
    const t = s.trips[0];
    t.hotels = t.hotels.filter(
      (h: { id: string }) => !h.id.includes(":hotel:"),
    );
    const first = t.transport[0];
    first.fare = 20000;
    first.paid = 1000;
    first.status = "Booked";
    first.reference = "My booking";
    t.transport[1].fare = 3500;
    t.transport[2].fare = 5500;
    t.transport[2].mode = "Regional flight";
    t.transport[3].fare = 14000;
    t.hotels[0].notes = "My personal hotel notes";
    localStorage.setItem("tripwise.v1", JSON.stringify(s));
  });
  await page.reload();
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem("tripwise.v1")!).trips,
  );
  await page
    .getByRole("button", { name: "Review research update", exact: true })
    .click();
  const pack = page.locator(".research-update");
  await expect(pack).toContainText("Booking/payment history preserved");
  await pack
    .getByRole("button", {
      name: "Apply safe additions & untouched fares",
      exact: true,
    })
    .click();
  const after = await page.evaluate(
    () => JSON.parse(localStorage.getItem("tripwise.v1")!).trips,
  );
  expect(after[0].transport).toHaveLength(4);
  expect(after[0].transport[0]).toEqual(before[0].transport[0]);
  expect(after[0].transport[1].fare).toBe(3567);
  expect(after[0].transport[2].fare).toBe(4946);
  expect(after[0].transport[3].fare).toBe(15312);
  expect(after[0].hotels).toHaveLength(before[0].hotels.length + 6);
  expect(
    after[0].hotels.filter((h: { selected: boolean }) => h.selected),
  ).toEqual(before[0].hotels.filter((h: { selected: boolean }) => h.selected));
  expect(after[0].hotels[0].notes).toBe("My personal hotel notes");
  expect(after[1]).toEqual(before[1]);
  await expect(
    pack.getByRole("button", {
      name: "Apply safe additions & untouched fares",
      exact: true,
    }),
  ).toBeDisabled();
  await page.reload();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("tripwise.v1")!).trips,
    ),
  ).toEqual(after);
});

test("Malaysia-only trip receives shared Kuala Lumpur quotes safely across fresh and existing browsers", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Active trip", { exact: true })
    .selectOption({ label: "Malaysia only · Three islands & cities" });
  await navigate(page, "Hotels");
  await page.getByRole("button", { name: "Kuala Lumpur", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "AnCasa Hotel Kuala Lumpur, Chinatown",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Holiday Inn Express Kuala Lumpur City Centre",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".hotel-card")).toHaveCount(7);
  await expect(
    page.getByRole("heading", { name: "Tune Hotel KLIA-KLIA2", exact: true }),
  ).toHaveCount(1);
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tripwise.v1")!);
    const t = s.trips.find((t: { id: string }) => t.id === s.activeId);
    t.hotels = t.hotels.filter(
      (h: { id: string }) => !h.id.includes(":hotel:"),
    );
    localStorage.setItem("tripwise.v1", JSON.stringify(s));
  });
  await page.reload();
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem("tripwise.v1")!).trips,
  );
  await page
    .getByRole("button", { name: "Review research update", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Apply safe additions & untouched fares",
      exact: true,
    })
    .click();
  const after = await page.evaluate(
    () => JSON.parse(localStorage.getItem("tripwise.v1")!).trips,
  );
  expect(after[0]).toEqual(before[0]);
  expect(after[1].transport).toEqual(before[1].transport);
  expect(after[1].hotels.length - before[1].hotels.length).toBe(5);
  expect(
    after[1].hotels.filter((h: { selected: boolean }) => h.selected),
  ).toEqual(before[1].hotels.filter((h: { selected: boolean }) => h.selected));
  await expect(
    page.getByRole("button", {
      name: "Apply safe additions & untouched fares",
      exact: true,
    }),
  ).toBeDisabled();
  const fresh = await browser.newContext();
  const freshPage = await fresh.newPage();
  await freshPage.goto("/");
  await freshPage
    .getByLabel("Active trip", { exact: true })
    .selectOption({ label: "Malaysia only · Three islands & cities" });
  await freshPage
    .getByRole("navigation")
    .getByRole("button", { name: "Hotels", exact: true })
    .click();
  await freshPage
    .getByRole("button", { name: "Kuala Lumpur", exact: true })
    .click();
  await expect(
    freshPage.getByRole("heading", {
      name: "AnCasa Hotel Kuala Lumpur, Chinatown",
      exact: true,
    }),
  ).toBeVisible();
  await fresh.close();
});

test("Malaysia return ticket counts once in Transportation, transit costs use Expenses, and copied trip references survive refresh", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Active trip", { exact: true })
    .selectOption({ label: "Malaysia only · Three islands & cities" });
  await expect(page.getByTestId("return-ticket-total")).toHaveCount(0);
  await expect(page.getByTestId("flights-total")).toHaveText("₹44,847");
  const baseline = Number(
    (await page.getByTestId("total-trip-cost").innerText()).replace(
      /[^0-9]/g,
      "",
    ),
  );
  await expect(page.getByText("10h 35m", { exact: true })).toBeVisible();
  await page.locator(".transit-confirmations>summary").click();
  await expect(
    page.getByText("Associated leg: Kuala Lumpur (KUL) → Mumbai (BOM)", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add planning expense", exact: true })
    .click();
  let modal = page.getByRole("dialog");
  await modal
    .getByLabel("Description", { exact: true })
    .fill("Singapore MRT and lunch");
  await modal.getByLabel("Original amount", { exact: true }).fill("1500");
  await expect(
    modal.getByLabel("Include this transit estimate in the budget", {
      exact: true,
    }),
  ).toBeChecked();
  await modal.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByTestId("total-trip-cost")).toHaveText(
    "₹" + (baseline + 1500).toLocaleString("en-IN"),
  );
  await navigate(page, "Expenses");
  const row = page
    .getByRole("row")
    .filter({ hasText: "Singapore MRT and lunch" });
  await row.getByRole("button", { name: "Edit record", exact: true }).click();
  modal = page.getByRole("dialog");
  await modal
    .getByLabel("Include this transit estimate in the budget", { exact: true })
    .uncheck();
  await modal.getByRole("button", { name: "Save changes" }).click();
  await navigate(page, "Overview");
  await expect(page.getByTestId("total-trip-cost")).toHaveText(
    "₹" + baseline.toLocaleString("en-IN"),
  );
  await navigate(page, "Transportation");
  await expect(
    page.getByRole("heading", {
      name: "International round-trip ticket",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".ticket-legs")).toContainText(
    "Mumbai (BOM) → Kuala Lumpur (KUL)",
  );
  await expect(page.locator(".ticket-legs")).toContainText(
    "Kuala Lumpur (KUL) → Mumbai (BOM)",
  );
  await expect(page.getByTestId("transport-total")).toHaveText("₹49,847");
  await page
    .getByRole("button", { name: "Edit ticket & payments", exact: true })
    .click();
  modal = page.getByRole("dialog");
  await modal
    .getByLabel("Ticket name", { exact: true })
    .fill("My flexible return ticket");
  await modal
    .getByLabel("Ticket booking status", { exact: true })
    .selectOption("Booked");
  await modal.getByLabel("Amount paid (INR)", { exact: true }).fill("1000");
  await modal.getByRole("button", { name: "Save changes" }).click();
  await navigate(page, "Overview");
  await expect(page.getByTestId("total-paid")).toContainText("₹1,000");
  await expect(page.getByTestId("confirmed-unpaid")).toContainText("₹34,550");
  await page
    .getByLabel("Active trip", { exact: true })
    .selectOption({ label: "Malaysia + Singapore Solo Trip 2027" });
  await expect(page.getByTestId("flights-total")).toHaveText("₹47,950");
  await expect(
    page.getByRole("heading", {
      name: "Singapore Changi Airport — Transit Stop",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "My trips", exact: true }).click();
  const card = page.locator(".trip-card").filter({
    has: page.getByRole("heading", {
      name: "Malaysia only · Three islands & cities",
      exact: true,
    }),
  });
  await card
    .getByRole("button", {
      name: "Duplicate Malaysia only · Three islands & cities",
      exact: true,
    })
    .click();
  await page.reload();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await navigate(page, "Transportation");
  await expect(page.getByTestId("return-ticket-total")).toHaveText("₹35,550");
});

test("one conditional city schedule preserves the planned inbound connection and entry verification", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Active trip", { exact: true })
    .selectOption({ label: "Malaysia only · Three islands & cities" });
  await navigate(page, "Itinerary");
  await expect(
    page.getByRole("heading", {
      name: "International round-trip ticket",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Singapore Layover Sightseeing — 10h 35m Connection",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Singapore sightseeing option", { exact: true }),
  ).toHaveCount(0);
  const initial = await page.evaluate(
    () => JSON.parse(localStorage.getItem("tripwise.v1")!).trips[1].layovers[0],
  );
  expect(initial.date).toBe("2027-01-27");
  expect(initial.direction).toBe("Inbound");
  await page.locator(".suggested-transit>summary").click();
  await expect(page.locator(".suggested-transit")).toContainText(
    "By approximately 15:30",
  );
  await expect(page.locator(".suggested-transit")).toContainText(
    "Vegetarian lunch",
  );
  await expect(page.locator(".suggested-transit")).toContainText(
    "eggs are acceptable",
  );
  await page
    .getByRole("button", { name: "Edit transit details", exact: true })
    .click();
  let modal = page.getByRole("dialog");
  await modal
    .getByLabel("Confirmed layover date", { exact: true })
    .fill("2027-01-27");
  await modal
    .getByLabel("Confirmed journey direction", { exact: true })
    .selectOption("Inbound");
  await modal
    .getByLabel("Entry permission verification", { exact: true })
    .selectOption("Verified permitted");
  await modal
    .getByLabel("Baggage checked through", { exact: true })
    .selectOption("Yes");
  await modal
    .getByLabel("Protected connection verified", { exact: true })
    .selectOption("Yes");
  await modal
    .getByLabel("Additional airline check-in required", { exact: true })
    .selectOption("No");
  await modal.getByLabel("Arrival terminal", { exact: true }).fill("T1");
  await modal.getByLabel("Departure terminal", { exact: true }).fill("T2");
  await expect(
    modal.getByLabel("Sightseeing option", { exact: true }),
  ).toHaveCount(0);
  await modal.getByRole("button", { name: "Save changes" }).click();
  await page.locator(".transit-confirmations>summary").click();
  await expect(
    page.getByText("Associated leg: Kuala Lumpur (KUL) → Mumbai (BOM)", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Transit: Singapore Changi Airport", { exact: true }),
  ).toBeVisible();
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tripwise.v1")!),
  );
  const t = data.trips.find((t: { id: string }) => t.id === data.activeId);
  expect(t.stops.map((s: { name: string }) => s.name)).not.toContain(
    "Singapore",
  );
  expect(
    t.hotels.some(
      (h: { destination: string }) => h.destination === "Singapore",
    ),
  ).toBe(false);
  expect(t.start).toBe("2027-01-17");
  expect(t.end).toBe("2027-01-27");
  await page
    .getByRole("button", { name: "Edit transit details", exact: true })
    .click();
  modal = page.getByRole("dialog");
  await modal
    .getByLabel("Entry permission verification", { exact: true })
    .selectOption("Not permitted");
  await modal.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByText(
      "Remain airside at Changi Airport and use available transit-area facilities.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator(".suggested-transit")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".transit-time-grid")).toContainText("18:50");
  await page.screenshot({
    path: "/tmp/tripwise-malaysia-transit-mobile.png",
    fullPage: true,
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await navigate(page, "Itinerary");
  await expect(
    page.getByText(
      "Remain airside at Changi Airport and use available transit-area facilities.",
      { exact: true },
    ),
  ).toBeVisible();
});

test("legacy Malaysia flight update preserves a confirmed paid booking and offers transit details without forcing the quote", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("tripwise.v1")!);
    const t = s.trips[1];
    delete t.fareGroups;
    delete t.layovers;
    t.activities = t.activities.filter(
      (a: { layoverId?: string }) => !a.layoverId,
    );
    t.checklist = t.checklist.filter(
      (c: { id: string }) => !c.id.includes(":sin-check-"),
    );
    t.transport = t.transport.filter(
      (r: { source: string; destination: string }) =>
        !(
          r.source === "Kuala Lumpur (KUL)" && r.destination === "Mumbai (BOM)"
        ),
    );
    const out = t.transport[0];
    delete out.fareGroupId;
    out.fare = 12500;
    out.paid = 500;
    out.status = "Booked";
    out.reference = "Personal confirmed booking";
    t.transport[t.transport.length - 1].status = "Researching";
    s.activeId = t.id;
    localStorage.setItem("tripwise.v1", JSON.stringify(s));
  });
  await page.reload();
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem("tripwise.v1")!).trips,
  );
  await navigate(page, "Transportation");
  await page
    .getByRole("button", { name: "Review Malaysia flight update", exact: true })
    .click();
  await expect(
    page.getByText(
      "Paid, booked, cancelled, referenced or already-linked records are protected.",
      { exact: false },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Add provisional transit details only",
      exact: true,
    })
    .click();
  const after = await page.evaluate(
    () => JSON.parse(localStorage.getItem("tripwise.v1")!).trips,
  );
  expect(after[0]).toEqual(before[0]);
  expect(after[1].transport).toEqual(before[1].transport);
  expect(after[1].hotels).toEqual(before[1].hotels);
  expect(after[1].fareGroups).toBeUndefined();
  expect(after[1].layovers).toHaveLength(1);
  await expect(page.getByTestId("return-ticket-total")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Singapore Changi Airport — Transit Stop",
      exact: true,
    }),
  ).toBeVisible();
});

test("both scenarios use one Transportation Summary and Malaysia has separate final KL accommodation", async ({
  page,
}) => {
  await page.goto("/");
  await navigate(page, "Transportation");
  await expect(
    page.getByRole("heading", { name: "Transportation Summary", exact: true }),
  ).toHaveCount(1);
  await expect(page.getByTestId("international-airfare")).toHaveText("₹44,383");
  await expect(page.getByTestId("domestic-airfare")).toHaveText("₹3,567");
  await expect(page.getByTestId("local-transport")).toHaveText("₹5,000");
  await expect(page.getByTestId("transport-total")).toHaveText("₹52,950");
  const combinedBefore = await page.evaluate(
    () => JSON.parse(localStorage.getItem("tripwise.v1")!).trips[0],
  );
  await page
    .getByLabel("Active trip", { exact: true })
    .selectOption({ label: "Malaysia only · Three islands & cities" });
  await expect(
    page.getByRole("heading", { name: "Transportation Summary", exact: true }),
  ).toHaveCount(1);
  await expect(page.getByTestId("international-airfare")).toHaveText("₹35,550");
  await expect(page.getByTestId("domestic-airfare")).toHaveText("₹9,297");
  await expect(page.getByTestId("transport-total")).toHaveText("₹49,847");
  await expect(
    page
      .locator(".transport-route")
      .filter({ hasText: "Penang (PEN)" })
      .filter({ hasText: "Mumbai (BOM)" }),
  ).toHaveCount(0);
  await expect(
    page
      .locator(".transport-route")
      .filter({ hasText: "Penang (PEN)" })
      .filter({ hasText: "Kuala Lumpur (KUL)" }),
  ).toHaveCount(1);
  await navigate(page, "Overview");
  await expect(page.getByTestId("flights-total")).toHaveText("₹44,847");
  await expect(
    page.getByText("Partial — accommodation incomplete", { exact: true }),
  ).toHaveCount(0);
  const finalStay = page
    .getByRole("row")
    .filter({ hasText: "26 Jan – 27 Jan" });
  await expect(finalStay).toContainText("Tune Hotel KLIA-KLIA2");
  await finalStay
    .getByRole("button", { name: "Compare alternatives", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Kuala Lumpur · 1 night", exact: true }),
  ).toBeVisible();
  const airportHotel = page
    .locator(".hotel-card")
    .filter({ hasText: "Tune Hotel KLIA-KLIA2" });
  await expect(airportHotel).toContainText("₹7,250");
  await expect(
    airportHotel.getByRole("button", { name: "Deselect", exact: true }),
  ).toBeVisible();
  await navigate(page, "Itinerary");
  await expect(
    page.getByRole("heading", {
      name: "International round-trip ticket",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Transportation Summary", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Singapore Layover Sightseeing — 10h 35m Connection",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Travel: Penang (PEN) → Kuala Lumpur (KUL)", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Travel: Kuala Lumpur (KUL) → Mumbai (BOM)", {
      exact: true,
    }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/tripwise-refined-itinerary-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await navigate(page, "Transportation");
  await expect(page.getByTestId("transport-total")).toHaveText("₹49,847");
  await expect(page.locator(".shared-transport-summary")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/tripwise-refined-transport-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("tripwise.v1")!).trips[0],
    ),
  ).toEqual(combinedBefore);
});

test("both saved January scenarios shift once, preserving costs, payments and user notes", async ({
  page,
}) => {
  await page.goto("/");
  const old = await page.evaluate(async () => {
    const s = JSON.parse(localStorage.getItem("tripwise.v1")!);
    const forward = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(forward);
      if (value && typeof value === "object")
        return Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, forward(v)]),
        );
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const d = new Date(value + "T00:00:00Z");
        d.setUTCDate(d.getUTCDate() + 1);
        return d.toISOString().slice(0, 10);
      }
      return value;
    };
    s.trips = s.trips.map((t: Record<string, unknown>) => {
      const old = forward(t) as Record<string, unknown>;
      delete old.january2027Shift;
      return old;
    });
    s.trips[1].expenses[0].paid = 400;
    s.trips[1].expenses[0].paymentStatus = "Partially Paid";
    s.trips[1].expenses[0].notes =
      "Preserve my vegetarian meals and payment history";
    s.trips[1].hotels.find(
      (h: { name: string }) => h.name === "Tune Hotel KLIA-KLIA2",
    ).selected = true;
    const path = "/src/lib/januaryShift.ts";
    const { migrateStore } = await import(path);
    const migrated = migrateStore(s);
    localStorage.setItem("tripwise.v1", JSON.stringify(migrated));
    return s;
  });
  await page.reload();
  const after = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tripwise.v1")!),
  );
  for (let i = 0; i < 2; i++) {
    expect(after.trips[i]).toMatchObject({
      start: "2027-01-17",
      end: "2027-01-27",
      january2027Shift: 1,
    });
    expect(after.trips[i].transport[0]).toMatchObject({
      departureDate: "2027-01-16",
      arrivalDate: "2027-01-17",
    });
    expect(after.trips[i].hotels.map((h: { id: string }) => h.id)).toEqual(
      old.trips[i].hotels.map((h: { id: string }) => h.id),
    );
    expect(after.trips[i].activities.map((a: { id: string }) => a.id)).toEqual(
      old.trips[i].activities.map((a: { id: string }) => a.id),
    );
    expect(
      after.trips[i].transport.map((r: { fare: number }) => r.fare),
    ).toEqual(old.trips[i].transport.map((r: { fare: number }) => r.fare));
  }
  expect(after.trips[1].expenses[0]).toMatchObject({
    paid: 400,
    paymentStatus: "Partially Paid",
    notes: "Preserve my vegetarian meals and payment history",
  });
  expect(after.trips[1].layovers[0]).toMatchObject({
    date: "2027-01-27",
    direction: "Inbound",
    arrivalTime: "08:15",
    departureTime: "18:50",
  });
  await page
    .getByLabel("Active trip", { exact: true })
    .selectOption({ label: "Malaysia only · Three islands & cities" });
  await expect(page.getByTestId("flights-total")).toHaveText("₹44,847");
  await navigate(page, "Hotels");
  await page.getByRole("button", { name: "Kuala Lumpur", exact: true }).click();
  const tune = page
    .locator(".hotel-card")
    .filter({ hasText: "Tune Hotel KLIA-KLIA2" });
  await expect(tune).toContainText("Selected stay");
  await expect(tune).toContainText("₹7,250");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tripwise.v1")!),
  );
  await page.reload();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem("tripwise.v1")!)),
  ).toEqual(saved);
});

test("Tune KLIA candidate is scoped to final Malaysia stay and selected costs persist", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Active trip", { exact: true })
    .selectOption({ label: "Malaysia only · Three islands & cities" });
  await navigate(page, "Hotels");
  await page.getByRole("button", { name: "Kuala Lumpur", exact: true }).click();
  const card = page.locator(".hotel-card").filter({
    has: page.getByRole("heading", {
      name: "Tune Hotel KLIA-KLIA2",
      exact: true,
    }),
  });
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("₹7,250");
  await expect(card).toContainText("Researching");
  await card.getByRole("button", { name: "Deselect", exact: true }).click();
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tripwise.v1")!),
  );
  const tripBefore = before.trips.find(
    (t: { id: string }) => t.id === before.activeId,
  );
  await card.getByRole("button", { name: "Select stay", exact: true }).click();
  await expect(card).toContainText("Selected stay");
  await page.reload();
  await navigate(page, "Hotels");
  await page.getByRole("button", { name: "Kuala Lumpur", exact: true }).click();
  await expect(card).toContainText("Selected stay");
  const after = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tripwise.v1")!),
  );
  const tripAfter = after.trips.find(
    (t: { id: string }) => t.id === after.activeId,
  );
  const hotel = tripAfter.hotels.find(
    (h: { name: string }) => h.name === "Tune Hotel KLIA-KLIA2",
  );
  expect(hotel).toMatchObject({
    selected: true,
    nightly: 5302,
    taxes: 1948,
    paid: 0,
    refunded: 0,
    status: "Researching",
  });
  expect(
    tripAfter.hotels.filter(
      (h: { checkIn: string }) => h.checkIn === "2027-01-17",
    ),
  ).toEqual(
    tripBefore.hotels.filter(
      (h: { checkIn: string }) => h.checkIn === "2027-01-17",
    ),
  );
  expect(after.trips[0]).toEqual(before.trips[0]);
  await navigate(page, "Overview");
  const stay = page.getByRole("row").filter({ hasText: "26 Jan – 27 Jan" });
  await expect(stay).toContainText("Tune Hotel KLIA-KLIA2");
  await expect(stay).toContainText("₹7,250");
});

test("published backup and flight allowances survive editing, export and reset", async ({
  page,
}) => {
  await page.goto("/");
  await navigate(page, "Transportation");
  const outbound = page
    .locator(".transport-card")
    .filter({ hasText: "Mumbai (BOM)" })
    .filter({ hasText: "Kuala Lumpur (KUL)" });
  await expect(outbound).toContainText(
    "1 piece · up to 7 kg · Checked baggage: 30 kg",
  );
  const regional = page
    .locator(".transport-card")
    .filter({ hasText: "Langkawi (LGK)" })
    .filter({ hasText: "Singapore (SIN)" });
  await expect(regional).toContainText("₹4,946");
  await expect(regional).toContainText("Checked baggage: 25 kg");
  await page
    .getByLabel("Active trip", { exact: true })
    .selectOption({ label: "Malaysia only · Three islands & cities" });
  const leg = page
    .locator(".transport-card")
    .filter({ hasText: "Mumbai (BOM)" })
    .filter({ hasText: "Kuala Lumpur (KUL)" })
    .first();
  await leg.getByRole("button", { name: "Edit record", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByLabel("Checked baggage allowance (kg)", { exact: true }),
  ).toHaveValue("30");
  await expect(dialog.getByLabel("Base fare", { exact: true })).toBeDisabled();
  await dialog
    .getByLabel("Checked baggage allowance (kg)", { exact: true })
    .fill("32");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await page.reload();
  await navigate(page, "Transportation");
  await expect(leg).toContainText("Checked baggage: 32 kg");
  const raw = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tripwise.v1")!),
  );
  expect(raw.trips[1].transport[0]).toMatchObject({
    checkedBaggageKg: 32,
    cabinBaggageKg: 7,
    cabinBaggagePieces: 1,
    fare: 0,
  });
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  expect((await downloadPromise).suggestedFilename()).toContain(
    "tripwise-backup",
  );
  await page
    .getByRole("button", { name: "Settings & backups", exact: true })
    .click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Reset to published data", exact: true })
    .click();
  const reset = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tripwise.v1")!),
  );
  expect(reset.trips[1].transport[0]).toMatchObject({
    checkedBaggageKg: 25,
    cabinBaggageKg: 7,
    cabinBaggagePieces: 1,
  });
  expect(
    reset.trips[1].hotels.find(
      (h: { name: string }) => h.name === "Tune Hotel KLIA-KLIA2",
    ).selected,
  ).toBe(true);
});
