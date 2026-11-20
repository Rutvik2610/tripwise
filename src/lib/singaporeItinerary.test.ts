import { describe, it, expect } from "vitest";
import { seed, publishedSnapshotSeed } from "./seed";
import { migrateStore } from "./februaryFlights";
import { correctDefaultHotelDates } from "./defaultData";
import { totals } from "./calc";
import { validate } from "./storage";

describe("refined Singapore source itinerary", () => {
  const current = seed();
  const trip = current.trips[0];
  const prior = migrateStore(publishedSnapshotSeed());
  const singapore = trip.activities.filter(
    (a) => a.destination === "Singapore",
  );
  // The later source-data accounting correction classified these six existing
  // allowances explicitly; the historical November backup predates that change.
  prior.trips.forEach((t) =>
    t.expenses.forEach((e) => {
      e.kind = "Allowance";
    }),
  );
  it("preserves all other trip data, flights, hotels and historical expenses", () => {
    expect(current.trips[1]).toEqual(correctDefaultHotelDates(prior.trips[1]));
    const { activities: before, ...protectedBefore } = correctDefaultHotelDates(
      prior.trips[0],
    );
    const { activities: after, ...protectedAfter } = trip;
    expect(protectedAfter).toEqual(protectedBefore);
    expect(after.filter((a) => a.destination !== "Singapore")).toEqual(
      before.filter((a) => a.destination !== "Singapore"),
    );
    expect(validate(JSON.parse(JSON.stringify(current)))).toEqual(current);
  });
  it("covers five dates with chronological main activities and preserves stable IDs", () => {
    expect([...new Set(singapore.map((a) => a.date))]).toEqual([
      "2027-01-30",
      "2027-01-31",
      "2027-02-01",
      "2027-02-02",
      "2027-02-03",
    ]);
    expect(new Set(singapore.map((a) => a.id)).size).toBe(singapore.length);
    for (const date of new Set(singapore.map((a) => a.date))) {
      const main = singapore.filter(
        (a) => a.date === date && a.includeInBudget !== false,
      );
      for (let i = 1; i < main.length; i++)
        expect(main[i].start >= (main[i - 1].end || main[i - 1].start)).toBe(
          true,
        );
    }
    for (const name of [
      "Merlion Park",
      "Little India",
      "Universal Studios Singapore",
    ]) {
      expect(singapore.find((a) => a.name === name)?.id).toBe(
        prior.trips[0].activities.find(
          (a) => a.destination === "Singapore" && a.name === name,
        )?.id,
      );
    }
    expect(
      singapore.some((a) => /SkyPark|Cable Car|S.E.A. Aquarium/.test(a.name)),
    ).toBe(false);
    expect(
      singapore
        .filter((a) => a.date === "2027-02-01" && a.bookingRequired)
        .map((a) => a.name),
    ).toEqual(["Universal Studios Singapore"]);
  });
  it("keeps optional costs excluded, avoids new expenses and changes only superseded forecasts", () => {
    for (const name of [
      "Singapore Oceanarium",
      "Harry Potter: Visions of Magic — conditional",
      "Skyline Luge Singapore",
    ]) {
      expect(singapore.find((a) => a.name === name)).toMatchObject({
        cost: 0,
        costPending: true,
        bookingRequired: true,
      });
    }
    expect(
      singapore.find((a) => a.name === "Universal Studios Singapore"),
    ).toMatchObject({ cost: 6000, costPending: true });
    expect(
      singapore.find((a) => a.name === "Optional Sampan boat ride"),
    ).toMatchObject({ includeInBudget: false, cost: 0, costPending: true });
    expect(
      singapore
        .filter((a) => a.includeInBudget !== false)
        .reduce((s, a) => s + a.cost, 0),
    ).toBe(6000);
    expect(trip.expenses).toEqual(prior.trips[0].expenses);
    expect(totals(trip).estimated).toBe(
      totals(correctDefaultHotelDates(prior.trips[0])).estimated - 8700,
    );
  });
  it("keeps uncertain schedules provisional and protects departure buffers without duplicating flights", () => {
    expect(
      singapore.find((a) => a.name.includes("Garden Rhapsody"))?.notes,
    ).toContain("provisional");
    expect(
      singapore.find((a) => a.name.includes("Harry Potter"))?.notes,
    ).toContain("conditional");
    expect(
      singapore.find((a) => a.name.includes("Jewel Changi"))?.notes,
    ).toContain("landside");
    expect(
      singapore.find(
        (a) =>
          a.name === "International departure formalities and airport buffer",
      ),
    ).toMatchObject({ start: "16:00", end: "18:00", date: "2027-02-03" });
    expect(
      singapore.some((a) => /flight departs|Singapore.*Mumbai/i.test(a.name)),
    ).toBe(false);
  });
});
