import { describe, it, expect } from "vitest";
import { makeTrip, seed, blankHotel, blankTransport } from "./seed";
import { applyResearchUpdate, researchChanges, hotelQuotes } from "./research";
import { costOverview, hotelDifference } from "./overview";
import { hotelTotal, selectHotel, totals, transportTotal } from "./calc";
import { validate } from "./storage";
import type { Trip } from "./model";
function legacyTrip() {
  const t = makeTrip();
  t.hotels = t.hotels.filter((h) => !h.id.includes(":hotel:"));
  t.transport.forEach((r, i) => {
    r.fare = [12500, 3500, 5500, 14000][i];
    r.mode =
      i === 1
        ? "Domestic flight"
        : i === 2
          ? "Regional flight"
          : "International flight";
  });
  return t;
}
const applySafe = (t: Trip) =>
  applyResearchUpdate(
    t,
    researchChanges(t)
      .filter((c) => c.state === "ready")
      .map((c) => c.key),
  );
describe("January research quotes", () => {
  it("provides all six unselected, unpaid research hotels in the right stays", () => {
    const t = makeTrip();
    const expected = [13476, 16347, 15588, 9360, 17436, 31448];
    hotelQuotes.forEach((q, i) => {
      const h = t.hotels.find((h) => h.name === q.name)!;
      expect(h).toBeDefined();
      expect(hotelTotal(h)).toBe(expected[i]);
      expect(h.selected).toBe(false);
      expect(h.paid).toBe(0);
      expect(h.refunded).toBe(0);
      expect(h.status).toBe("Researching");
      expect(h.rating).toBeNull();
      expect(h.checkIn).toBe(i === 5 ? "2027-01-24" : "2027-01-18");
      expect(h.checkOut).toBe(i === 5 ? "2027-01-28" : "2027-01-21");
    });
  });
  it("includes complete quotes only once for Holiday Inn and Hotel 81", () => {
    const t = makeTrip();
    for (const name of [
      "Holiday Inn Express Kuala Lumpur City Centre",
      "Hotel 81 Dickson",
    ]) {
      const h = t.hotels.find((h) => h.name === name)!;
      expect(h.taxMode).toBe("Included");
      expect(h.taxes).toBe(0);
    }
    expect(
      t.hotels.find((h) => h.name.startsWith("Holiday Inn"))!.breakfast,
    ).toBe(true);
  });
  it("updates four provisional flights to 48,201 without duplicating IDs or inventing schedule details", () => {
    const old = legacyTrip();
    const ids = old.transport.map((r) => r.id);
    const next = applySafe(old);
    expect(next.transport).toHaveLength(4);
    expect(next.transport.map((r) => r.id)).toEqual(ids);
    expect(next.transport.map(transportTotal)).toEqual([
      24125, 3567, 5197, 15312,
    ]);
    expect(costOverview(next).flights).toBe(48201);
    expect(
      next.transport.every(
        (r) =>
          !r.departureTime &&
          !r.arrivalTime &&
          !r.provider &&
          !r.number &&
          r.paid === 0,
      ),
    ).toBe(true);
    expect(next.transport[2].mode).toBe("International flight");
  });
  it("is idempotent and keeps old selections, manual hotels and unrelated scenario intact", () => {
    const old = legacyTrip();
    old.hotels.push({
      ...blankHotel(),
      name: "J-Hotel by Dorsett",
      destination: "Kuala Lumpur",
      checkIn: "2027-01-18",
      checkOut: "2027-01-21",
      nightly: 3100,
      notes: "My own notes",
    });
    const selected = old.hotels.filter((h) => h.selected).map((h) => h.id);
    const next = applySafe(old);
    expect(applySafe(next)).toEqual(next);
    expect(next.hotels.filter((h) => h.selected).map((h) => h.id)).toEqual(
      selected,
    );
    expect(next.hotels.find((h) => h.name === "J-Hotel by Dorsett")).toEqual(
      old.hotels.at(-1),
    );
    const only = makeTrip(true);
    expect(applySafe(only)).toEqual(only);
    expect(only.hotels.some((h) => h.name === "Hotel 81 Dickson")).toBe(false);
  });
  it("matches hotel aliases and requests confirmation rather than duplicating or overwriting edited quotes", () => {
    const t = legacyTrip();
    const existing = {
      ...blankHotel(),
      name: "AnCasa Hotel Chinatown",
      destination: "Kuala Lumpur",
      checkIn: "2027-01-18",
      checkOut: "2027-01-21",
      nightly: 3000,
      notes: "User notes",
      rating: 8.8,
    };
    t.hotels.push(existing);
    const change = researchChanges(t).find((c) =>
      c.label.startsWith("AnCasa"),
    )!;
    expect(change.state).toBe("review");
    const safe = applySafe(t);
    expect(safe.hotels.find((h) => h.id === existing.id)).toEqual(existing);
    expect(safe.hotels.filter((h) => /ancasa/i.test(h.name))).toHaveLength(1);
    const approved = applyResearchUpdate(t, [change.key], true);
    expect(hotelTotal(approved.hotels.find((h) => h.id === existing.id)!)).toBe(
      13476,
    );
    expect(approved.hotels.find((h) => h.id === existing.id)).toMatchObject({
      notes: "User notes",
      rating: 8.8,
      selected: false,
    });
  });
  it("never overwrites paid/confirmed/cancelled hotel or flight records, even with review approval", () => {
    const t = makeTrip();
    const h = t.hotels.find((h) => h.name.startsWith("Moxy"))!;
    h.status = "Booked";
    h.selected = true;
    const allowance = t.hotels.find(
      (x) => x.destination === "Kuala Lumpur" && x.id !== h.id && x.selected,
    )!;
    allowance.selected = false;
    h.paid = 123;
    h.refunded = 20;
    t.transport[0] = {
      ...t.transport[0],
      fare: 22222,
      status: "Booked",
      paid: 1000,
      refunded: 50,
      reference: "real booking",
    };
    t.transport[1].status = "Cancelled";
    const result = applyResearchUpdate(
      t,
      researchChanges(t).map((c) => c.key),
      true,
    );
    expect(result).toEqual(t);
  });
  it("shows a non-destructive path for edited fares and retains schedule/provider details on approval", () => {
    const t = legacyTrip();
    t.transport[0] = {
      ...t.transport[0],
      fare: 18000,
      baggage: 1000,
      provider: "User-entered airline",
      departureTime: "10:30",
      notes: "My note",
    };
    const c = researchChanges(t).find(
      (c) => c.kind === "transport" && c.label.startsWith("BOM"),
    )!;
    expect(c.state).toBe("review");
    expect(applySafe(t).transport[0]).toEqual(t.transport[0]);
    const approved = applyResearchUpdate(t, [c.key], true);
    expect(transportTotal(approved.transport[0])).toBe(24125);
    expect(approved.transport[0]).toMatchObject({
      provider: "User-entered airline",
      departureTime: "10:30",
      notes: "My note",
      id: t.transport[0].id,
    });
  });
  it("flags duplicate matching flights rather than adding another", () => {
    const t = legacyTrip();
    t.transport.push({ ...t.transport[0], id: "duplicate-previous-flight" });
    const c = researchChanges(t).find((c) => c.label.startsWith("BOM"))!;
    expect(c.state).toBe("protected");
    expect(
      applySafe(t).transport.filter(
        (r) =>
          r.source === t.transport[0].source &&
          r.destination === t.transport[0].destination,
      ),
    ).toHaveLength(2);
  });
  it("preserves a changed departure date and does not add a duplicate route", () => {
    const t = legacyTrip();
    t.transport[0].departureDate = "2027-01-19";
    const c = researchChanges(t).find((c) => c.label.startsWith("BOM"))!;
    expect(c.state).toBe("protected");
    const next = applySafe(t);
    expect(next.transport).toHaveLength(4);
    expect(next.transport[0]).toEqual(t.transport[0]);
  });
  it("adds a truly missing route with a stable ID only once", () => {
    const t = legacyTrip();
    t.transport = t.transport.slice(1);
    const next = applySafe(t);
    expect(next.transport).toHaveLength(4);
    expect(next.transport.find((r) => r.source === "Mumbai (BOM)")?.id).toBe(
      `${t.id}:flight:bom-kul`,
    );
    expect(applySafe(next)).toEqual(next);
  });
  it("round trips new and legacy backups without losing user choices or payment history", () => {
    const s = seed();
    const old = legacyTrip();
    s.trips[0] = old;
    s.activeId = old.id;
    old.expenses[0].paid = 100;
    old.expenses[0].refunded = 20;
    old.expenses[0].paymentStatus = "Partially Paid";
    const restored = validate(JSON.parse(JSON.stringify(s)));
    expect(restored).toEqual(s);
    const next = applySafe(restored.trips[0]);
    expect(next.expenses).toEqual(old.expenses);
    expect(next.hotels.filter((h) => h.selected)).toEqual(
      old.hotels.filter((h) => h.selected),
    );
    expect(
      validate(
        JSON.parse(
          JSON.stringify({ ...s, trips: [next, ...s.trips.slice(1)] }),
        ),
      ),
    ).toEqual({ ...s, trips: [next, ...s.trips.slice(1)] });
  });
});
describe("clear financial overview", () => {
  it("reconciles flights, selected hotels and other expenses exactly to the ledger forecast", () => {
    const t = makeTrip(),
      s = costOverview(t);
    expect(s.flights).toBe(48201);
    expect(s.selectedHotels).toBe(46334);
    expect(s.flightsAndHotels).toBe(94535);
    expect(s.other + s.flightsAndHotels).toBe(s.estimated);
    expect(s.remaining).toBe(t.budget - totals(t).estimated);
    expect(s.stays).toHaveLength(3);
    expect(s.nights).toBe(10);
    expect(s.complete).toBe(true);
  });
  it("does not add unselected alternatives and flags selection pending or unknown price", () => {
    const t = makeTrip();
    const before = totals(t).estimated;
    t.hotels.push({
      ...blankHotel(),
      name: "Expensive alternate",
      nightly: 100000,
    });
    expect(totals(t).estimated).toBe(before);
    t.hotels.forEach((h) => (h.selected = false));
    expect(costOverview(t)).toMatchObject({
      selectedHotels: 0,
      pending: 3,
      complete: false,
      flightsAndHotels: 48201,
    });
    t.hotels[0].selected = true;
    t.hotels[0].nightly = null;
    expect(costOverview(t).pending).toBe(3);
  });
  it("switches only one stay and computes the AnCasa versus Moxy saving dynamically", () => {
    let t = makeTrip();
    const a = t.hotels.find((h) => h.name.startsWith("AnCasa"))!,
      m = t.hotels.find((h) => h.name.startsWith("Moxy"))!;
    t = selectHotel(t, m.id);
    const prior = costOverview(t);
    expect(hotelDifference(t, a.id)).toBe(-2871);
    t = selectHotel(t, a.id);
    const after = costOverview(t);
    expect(after.selectedHotels - prior.selectedHotels).toBe(-2871);
    expect(after.estimated - prior.estimated).toBe(-2871);
    expect(after.remaining - prior.remaining).toBe(2871);
    expect(t.hotels.filter((h) => h.selected)).toHaveLength(3);
  });
  it("keeps payments, refunds, retained costs and nonflight transportation in their existing accounting model", () => {
    const t = makeTrip();
    t.transport[0] = {
      ...t.transport[0],
      status: "Booked",
      paid: 1000,
      refunded: 100,
    };
    t.hotels.find((h) => !h.selected)!.paid = 300;
    t.transport.push({
      ...blankTransport(),
      source: "Hotel",
      destination: "Airport",
      mode: "Taxi",
      fare: 700,
    });
    const s = costOverview(t);
    expect(s.flights).toBe(48201);
    expect(s.bookedFlights).toBe(24125);
    expect(s.unbookedFlights).toBe(24076);
    expect(s.paid).toBe(1200);
    expect(s.unpaid).toBe(23225);
    expect(s.flights + s.selectedHotels + s.other).toBe(totals(t).estimated);
    expect(s.retainedHotelCosts).toBe(300);
  });
});

describe("shared Kuala Lumpur research for Malaysia-only trips", () => {
  it("seeds five matching Kuala Lumpur candidates without Singapore hotels or flight updates", () => {
    const t = makeTrip(true);
    const candidates = t.hotels.filter((h) => h.id.includes(":hotel:"));
    expect(candidates).toHaveLength(5);
    expect(
      candidates.every(
        (h) =>
          h.destination === "Kuala Lumpur" &&
          h.checkIn === "2027-01-18" &&
          h.checkOut === "2027-01-21" &&
          !h.selected &&
          h.paid === 0,
      ),
    ).toBe(true);
    expect(candidates.map(hotelTotal)).toEqual([
      13476, 16347, 15588, 9360, 17436,
    ]);
    expect(t.hotels.some((h) => h.destination === "Singapore")).toBe(false);
    expect(t.transport.map(transportTotal)).toEqual([12500, 3500, 2500, 12000]);
  });
  it("adds shared candidates to older saved trips once and preserves their selections, financial history and other records", () => {
    const t = makeTrip(true);
    t.hotels = t.hotels.filter((h) => !h.id.includes(":hotel:"));
    t.hotels[0].paid = 500;
    t.hotels[0].notes = "Private note retained";
    const before = structuredClone(t);
    const next = applySafe(t);
    expect(next.hotels).toHaveLength(before.hotels.length + 5);
    expect(next.hotels.slice(0, before.hotels.length)).toEqual(before.hotels);
    expect(next.transport).toEqual(before.transport);
    expect(next.expenses).toEqual(before.expenses);
    expect(next.activities).toEqual(before.activities);
    expect(next.checklist).toEqual(before.checklist);
    expect(applySafe(next)).toEqual(next);
    expect(researchChanges(next).some((c) => c.kind === "transport")).toBe(
      false,
    );
  });
});
