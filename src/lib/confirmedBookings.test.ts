import { describe, expect, it } from "vitest";
import { seed } from "./seed";
import previousPlan from "../../tests/fixtures/pre-confirmation-plan.json";
import {
  daysBetween,
  hotelBreakdown,
  hotelTotal,
  ledger,
  paymentState,
  totals,
  travelMinutes,
} from "./calc";
import { costOverview } from "./overview";
import { layoverMinutes } from "./transit";
import { migrateStore } from "./februaryFlights";
import { validate } from "./storage";

describe("confirmed combined trip", () => {
  it("keeps the separate Malaysia-only scenario byte-equivalent and uses correct local calendar dates", () => {
    const s = seed(),
      t = s.trips[0];
    expect(s.trips[1]).toEqual(previousPlan.trips[1]);
    expect(t).toMatchObject({
      start: "2027-01-27",
      end: "2027-02-07",
      plannedNights: 10,
      budget: previousPlan.trips[0].budget,
    });
    expect(t.stops.map((r) => [r.start, r.end])).toEqual([
      ["2027-01-28", "2027-01-31"],
      ["2027-01-31", "2027-02-03"],
      ["2027-02-03", "2027-02-07"],
    ]);
    expect(totals(t).nights).toBe(10);
    expect(migrateStore(s)).toEqual(s);
    expect(validate(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it("counts one connecting booking plus three standalone bookings, five legs, and no duplicated paid fares", () => {
    const t = seed().trips[0];
    expect(t.fareGroups).toHaveLength(1);
    expect(t.transport).toHaveLength(5);
    expect(t.fareGroups![0]).toMatchObject({
      amount: 25990,
      paid: 25990,
      ticketIssuance: "Awaiting ticketing",
      status: "Booked",
    });
    expect(t.transport.filter((r) => r.fareGroupId)).toHaveLength(2);
    expect(
      t.transport
        .filter((r) => r.fareGroupId)
        .every((r) => r.fare === 0 && r.paid === 0),
    ).toBe(true);
    expect(t.transport.filter((r) => !r.fareGroupId)).toHaveLength(3);
    const flightRows = ledger(t).filter((r) => r.source === "Flights");
    expect(flightRows.reduce((s, r) => s + r.total, 0)).toBe(59250);
    expect(flightRows.reduce((s, r) => s + r.paid, 0)).toBe(59250);
    expect(
      flightRows.reduce((s, r) => s + Math.max(0, r.total - r.paid), 0),
    ).toBe(0);
    expect(
      t.transport.every(
        (r) =>
          (r.fareGroupId
            ? t.fareGroups!.find((g) => g.id === r.fareGroupId)?.status ===
              "Booked"
            : r.status === "Booked") &&
          !r.decisionId &&
          !r.reference,
      ),
    ).toBe(true);
    expect(costOverview(t).flightCount).toBe(5);
  });
  it("retains exact times, airports, unknown terminals and supplied baggage without UTC day shifts", () => {
    const t = seed().trips[0];
    expect(
      t.transport.map((r) => [
        r.number,
        r.departureDate,
        r.departureTime,
        r.arrivalDate,
        r.arrivalTime,
        r.checkedBaggageKg,
        r.cabinBaggageKg,
      ]),
    ).toEqual([
      ["SQ423", "2027-01-27", "23:35", "2027-01-28", "07:30", 30, 7],
      ["SQ108", "2027-01-28", "09:15", "2027-01-28", "10:20", 30, 7],
      ["MH1438", "2027-01-31", "11:45", "2027-01-31", "12:55", 25, 7],
      ["AK732", "2027-02-03", "12:40", "2027-02-03", "14:25", 20, 7],
      ["AI2108", "2027-02-07", "19:40", "2027-02-07", "23:25", 25, 7],
    ]);
    expect(t.transport.map(travelMinutes)).toEqual([325, 65, 70, 105, 375]);
    expect(t.transport[0].arrivalTerminal).toBe("");
    expect(t.transport[1]).toMatchObject({
      source: "Singapore Changi (SIN)",
      departureTerminal: "T2",
      destination: "Kuala Lumpur (KUL)",
      arrivalTerminal: "T1",
      aircraft: "",
    });
    expect(t.transport[0].aircraft).toBe(
      previousPlan.trips[0].transport[0].aircraft,
    );
    expect(layoverMinutes(t.layovers![0])).toBe(105);
    expect(t.layovers![0].notes).toContain("Terminal change required");
    expect(JSON.stringify(t.transport)).not.toContain("SZB");
  });
  it("records three actual hotel bookings with fixed INR payments and MYR whole-stay balances", () => {
    const t = seed().trips[0],
      hotels = t.hotels.filter((h) => h.selected);
    expect(hotels).toHaveLength(3);
    expect(hotels.map((h) => h.name).sort()).toEqual([
      "Easy Hotel KL Sentral",
      "Hotel 81 Dickson",
      "Nadias Hotel",
    ]);
    expect(
      hotels.map((h) => daysBetween(h.checkIn, h.checkOut)).sort(),
    ).toEqual([3, 3, 4]);
    expect(hotels.reduce((s, h) => s + h.paid, 0)).toBe(48389);
    expect(hotels.reduce((s, h) => s + h.propertyFees, 0)).toBe(69);
    expect(
      hotels.find((h) => h.destination === "Kuala Lumpur")?.propertyFees,
    ).toBe(30);
    expect(hotels.find((h) => h.destination === "Langkawi")?.propertyFees).toBe(
      39,
    );
    expect(
      hotels.every(
        (h) =>
          h.status === "Booked" &&
          h.freeCancellation &&
          !h.cancellationDeadline,
      ),
    ).toBe(true);
    for (const h of hotels) {
      expect(hotelTotal(h)).toBe(h.paid + h.propertyFees * 19);
      expect(paymentState(hotelTotal(h)!, h.paid, 0)).toBe(
        h.propertyFees ? "Partially Paid" : "Paid",
      );
    }
  });
  it("changing property exchange estimates preserves paid INR and settling a hotel balance never grows the forecast", () => {
    const t = seed().trips[0],
      h = t.hotels.find((h) => h.selected && h.destination === "Kuala Lumpur")!;
    const repriced = { ...h, rate: 80, propertyRate: 25 };
    expect(repriced.paid).toBe(9210);
    expect(hotelBreakdown(repriced).bookingSubtotal).toBe(9210);
    expect(hotelTotal(repriced)).toBe(9960);
    const settled = { ...repriced, paid: 9960 };
    expect(hotelTotal(settled)).toBe(hotelTotal(repriced));
    expect(hotelBreakdown(settled).propertyOutstanding).toBe(0);
    expect(paymentState(hotelTotal(settled)!, settled.paid, 0)).toBe("Paid");
  });
  it("reconciles actuals and remaining spending mathematically with no duplicate expense records", () => {
    const t = seed().trips[0],
      s = totals(t);
    expect(s).toMatchObject({
      paid: 107639,
      hotels: 49700,
      estimated: 160050,
      unpaid: 1311,
      remaining: -5050,
      remainingForecast: 52411,
    });
    expect(t.expenses.map((e) => ({ ...e, date: "" }))).toEqual(
      previousPlan.trips[0].expenses.map((e) => ({ ...e, date: "" })),
    );
    expect(
      t.expenses.some((e) =>
        [
          "Hotels",
          "International flights",
          "Domestic/regional flights",
        ].includes(e.category),
      ),
    ).toBe(false);
    expect(t.activities.every((a) => a.status !== "Booked")).toBe(true);
  });
  it("renders the revised sightseeing sequence with realistic arrival and departure buffers and provisional attractions", () => {
    const t = seed().trips[0],
      a = t.activities;
    expect(new Set(a.map((r) => r.id)).size).toBe(a.length);
    expect(
      a.find((r) => r.name === "Changi arrival, immigration and baggage"),
    ).toMatchObject({ date: "2027-02-03", start: "14:25", end: "15:45" });
    expect(a.find((r) => r.name === "Universal Studios Singapore")?.date).toBe(
      "2027-02-04",
    );
    expect(a.find((r) => r.name === "Singapore Oceanarium")?.date).toBe(
      "2027-02-05",
    );
    expect(a.find((r) => r.name.includes("Harry Potter"))?.notes).toContain(
      "conditional",
    );
    expect(
      a.find((r) => r.name === "Bugis Street Market and Bugis Junction")?.notes,
    ).toContain("Chinese New Year");
    expect(
      a.find(
        (r) =>
          r.name === "International departure formalities and airport buffer",
      ),
    ).toMatchObject({ date: "2027-02-07", start: "16:00", end: "18:00" });
    expect(
      a.find((r) => r.name === "Optional Sampan boat ride")?.includeInBudget,
    ).toBe(false);
    expect(
      a
        .filter((r) => r.category !== "Transportation")
        .some((r) => /SQ423|SQ108|MH1438|AK732|AI2108/.test(r.name)),
    ).toBe(false);
    const main = a.filter((r) => r.includeInBudget !== false);
    for (let i = 1; i < main.length; i++)
      if (main[i].date === main[i - 1].date)
        expect(main[i].start >= (main[i - 1].end || main[i - 1].start)).toBe(
          true,
        );
  });
});
