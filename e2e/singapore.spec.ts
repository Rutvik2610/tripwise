import { readFileSync as readPreviousPlan } from "node:fs";
const previousPlan = JSON.parse(
  readPreviousPlan(
    new URL("../tests/fixtures/pre-confirmation-plan.json", import.meta.url),
    "utf8",
  ),
);
import { test, expect } from "@playwright/test";
test("revised Singapore days render once in timeline and calendar without changing transport totals", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await nav.getByRole("button", { name: "Itinerary", exact: true }).click();
  const schedule = [
    ["30 Jan", "Merlion Park", "Garden Rhapsody — provisional light show"],
    ["31 Jan", "Singapore Oceanarium", "Skyline Luge Singapore"],
    ["1 Feb", "Universal Studios Singapore", "Flexible evening leisure"],
    ["2 Feb", "Little India", "Bugis Street Market and Bugis Junction"],
    [
      "3 Feb",
      "Jewel Changi — Rain Vortex and shopping",
      "International departure formalities and airport buffer",
    ],
  ];
  for (const view of ["Timeline", "Calendar"]) {
    await page.getByRole("button", { name: view, exact: true }).click();
    for (const [date, ...names] of schedule) {
      await page.locator(".day-tabs button").filter({ hasText: date }).click();
      await expect(page.locator(".day-section")).toHaveCount(1);
      for (const name of names)
        await expect(
          page.getByRole("heading", { name, exact: true }),
        ).toHaveCount(1);
    }
  }
  await expect(
    page.getByText("Travel: Singapore (SIN) → Mumbai (BOM)", { exact: true }),
  ).toHaveCount(1);
  await nav
    .getByRole("button", { name: "Transportation", exact: true })
    .click();
  await expect(page.getByTestId("transport-total")).toHaveText("₹51,140");
  await page.reload();
  await nav.getByRole("button", { name: "Itinerary", exact: true }).click();
  await page.locator(".day-tabs button").filter({ hasText: "31 Jan" }).click();
  const ocean = page.locator(".activity").filter({
    has: page.getByRole("heading", {
      name: "Singapore Oceanarium",
      exact: true,
    }),
  });
  await expect(ocean).toContainText("Price pending");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

// Retain regression coverage for the pre-confirmation estimates and alternative selector.
test.beforeEach(async ({ page }) => {
  await page.addInitScript((data) => {
    if (!localStorage.getItem("tripwise.v1"))
      localStorage.setItem("tripwise.v1", JSON.stringify(data));
  }, previousPlan);
});
