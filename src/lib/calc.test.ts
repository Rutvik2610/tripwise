import { describe, expect, it } from "vitest";
import {
  connectionWarnings,
  convert,
  daysBetween,
  expenseTotal,
  hotelTotal,
  netPaid,
  paymentState,
  savings,
  selectHotel,
  simulate,
  totals,
  transportTotal,
  travelMinutes,
} from "./calc";
import type { Trip } from "./model";
import {
  blankExpense,
  blankHotel,
  blankTransport,
  makeTrip,
  seed,
} from "./seed";
import { validate } from "./storage";
const emptyTrip = (): Trip => ({
  ...makeTrip(),
  expenses: [],
  hotels: [],
  transport: [],
  activities: [],
});
describe("currency and calendar calculations", () => {
  it("converts using a record snapshot and rounds to paise", () => {
    expect(convert(12.345, 19)).toBe(234.56);
    expect(
      expenseTotal({
        ...blankExpense(),
        amount: 100,
        currency: "MYR",
        rate: 19,
      }),
    ).toBe(1900);
  });
  it("calculates UTC calendar nights, including leap years and reversed ranges", () => {
    expect(daysBetween("2027-01-21", "2027-01-24")).toBe(3);
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
    expect(daysBetween("2027-01-24", "2027-01-21")).toBe(0);
  });
  it("uses inclusive trip days and exclusive hotel nights", () => {
    expect(totals(makeTrip()).days).toBe(11);
    expect(totals(makeTrip()).nights).toBe(10);
  });
});
describe("explicit hotel taxes", () => {
  const hotel = {
    ...blankHotel(),
    nightly: 100,
    currency: "MYR" as const,
    rate: 19,
    taxes: 30,
    tourismTax: 12,
    heritageTax: 3,
    propertyFees: 5,
  };
  it("never adds included general taxes twice", () =>
    expect(hotelTotal(hotel)).toBe(320 * 19));
  it("adds separate taxes and property fees once per stay", () =>
    expect(hotelTotal({ ...hotel, taxMode: "Separate" })).toBe(350 * 19));
  it("keeps unknown prices distinct from free stays", () => {
    expect(hotelTotal({ ...hotel, nightly: null })).toBeNull();
    expect(hotelTotal({ ...blankHotel(), nightly: 0 })).toBe(0);
  });
  it("counts only one selected alternative per stay", () => {
    let t = emptyTrip();
    t = {
      ...t,
      hotels: [
        { ...blankHotel(), name: "A", nightly: 100, selected: true },
        { ...blankHotel(), name: "B", nightly: 200 },
      ],
    };
    const selected = selectHotel(t, t.hotels[1].id);
    expect(selected.hotels.filter((h) => h.selected)).toHaveLength(1);
    expect(totals(selected).estimated).toBe(600);
    expect(savings(selected)).toBe(300);
  });
  it("does not change a different stay selection", () => {
    const t = makeTrip();
    const other = t.hotels.find((h) => h.name === "Malibest Resort")!;
    const next = selectHotel(t, other.id);
    expect(next.hotels.filter((h) => h.selected)).toHaveLength(3);
  });
});
describe("payments and refunds", () => {
  it("derives all payment statuses from historical INR payments", () => {
    expect(paymentState(1000, 0, 0)).toBe("Unpaid");
    expect(paymentState(1000, 300, 0)).toBe("Partially Paid");
    expect(paymentState(1000, 1000, 0)).toBe("Paid");
    expect(paymentState(1000, 1000, 1000)).toBe("Refunded");
    expect(paymentState(1000, 1000, 500)).toBe("Partially Paid");
    expect(netPaid(1000, 300)).toBe(700);
  });
  it("does not add estimated, confirmed and paid as independent costs", () => {
    const t = {
      ...emptyTrip(),
      expenses: [
        {
          ...blankExpense(),
          description: "Flight",
          amount: 1000,
          paid: 300,
          bookingStatus: "Booked",
        },
      ],
    };
    expect(totals(t)).toMatchObject({
      estimated: 1000,
      confirmed: 1000,
      paid: 300,
      unpaid: 700,
      remaining: 99000,
      bookings: 1,
    });
  });
  it("does not use unconfirmed payments to settle another booking", () => {
    const t = {
      ...emptyTrip(),
      expenses: [
        {
          ...blankExpense(),
          description: "A",
          amount: 1000,
          bookingStatus: "Booked",
        },
        { ...blankExpense(), description: "B", amount: 500, paid: 500 },
      ],
    };
    expect(totals(t).unpaid).toBe(1000);
  });
  it("retains nonrefunded cancellation costs in the forecast", () => {
    const t = {
      ...emptyTrip(),
      expenses: [
        {
          ...blankExpense(),
          amount: 1000,
          paid: 1000,
          refunded: 250,
          bookingStatus: "Cancelled",
        },
      ],
    };
    expect(totals(t)).toMatchObject({
      estimated: 750,
      paid: 750,
      confirmed: 0,
      unpaid: 0,
    });
  });
  it("tracks refunded cancelled payments without retaining the original cancelled estimate", () => {
    const t = {
      ...emptyTrip(),
      expenses: [
        {
          ...blankExpense(),
          amount: 1000,
          paid: 1000,
          refunded: 1000,
          bookingStatus: "Cancelled",
        },
      ],
    };
    expect(totals(t)).toMatchObject({
      estimated: 0,
      paid: 0,
      confirmed: 0,
      unpaid: 0,
    });
  });
});
describe("scenarios and transport", () => {
  it("keeps the Penang hotel out of the Singapore trip", () => {
    expect(makeTrip().hotels.some((h) => h.destination === "Penang")).toBe(
      false,
    );
    expect(
      makeTrip(true).hotels.some((h) => h.name === "Summer Tree Hotel Penang"),
    ).toBe(true);
  });
  it("compares independent scenario totals", () => {
    const a = makeTrip(),
      b = makeTrip(true);
    expect(totals(a).estimated).toBeGreaterThan(totals(b).estimated);
    const before = totals(b).estimated;
    a.expenses[0].amount += 1000;
    expect(totals(b).estimated).toBe(before);
  });
  it("computes simulator contingency on the subtotal once", () => {
    const t = {
      ...emptyTrip(),
      simulation: {
        preset: "Custom",
        nights: 10,
        nightly: 100,
        flights: 200,
        food: 10,
        transport: 10,
        attractions: 100,
        contingency: 10,
      },
    };
    expect(simulate(t).total).toBe(1672);
  });
  it("includes every fare component exactly once", () =>
    expect(
      transportTotal({
        ...blankTransport(),
        fare: 100,
        taxes: 20,
        baggage: 30,
        seat: 10,
        rate: 19,
      }),
    ).toBe(3040));
  it("uses India and Malaysia offsets for elapsed duration", () =>
    expect(
      travelMinutes({
        ...blankTransport(),
        source: "Mumbai",
        destination: "Kuala Lumpur",
        departureDate: "2027-01-18",
        departureTime: "10:00",
        arrivalDate: "2027-01-18",
        arrivalTime: "17:00",
      }),
    ).toBe(270));
  it("flags short connections and KUL / SZB changes without claiming protection", () => {
    const a = {
        ...blankTransport(),
        source: "Mumbai",
        destination: "KUL",
        departureTime: "08:00",
        arrivalDate: "2027-01-18",
        arrivalTime: "14:00",
      },
      b = {
        ...blankTransport(),
        source: "SZB",
        destination: "Langkawi",
        departureTime: "15:00",
        arrivalDate: "2027-01-18",
        arrivalTime: "16:00",
      };
    expect(connectionWarnings([a, b])[0]).toContain("Airport change");
    expect(connectionWarnings([a, b])[0]).toContain("Below conservative");
  });
});
describe("versioned backup validation", () => {
  it("accepts and round trips the complete demo", () => {
    const s = seed();
    expect(validate(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it("rejects malformed, future-schema and incomplete backups", () => {
    expect(() => validate({ version: 2 })).toThrow();
    expect(() => validate({ version: 1, trips: [] })).toThrow();
  });
  it("rejects negative amounts, duplicate IDs and invalid dates", () => {
    const s = seed();
    s.trips[0].budget = -1;
    expect(() => validate(s)).toThrow();
    const d = seed();
    d.trips[1].id = d.trips[0].id;
    expect(() => validate(d)).toThrow();
    const invalid = seed();
    invalid.trips[0].end = "2027-02-31";
    expect(() => validate(invalid)).toThrow();
  });
  it("rejects refunds above payments and multiple selected same-stay hotels", () => {
    const s = seed();
    s.trips[0].expenses[0].refunded = 100;
    expect(() => validate(s)).toThrow();
    const d = seed();
    d.trips[0].hotels[2].selected = true;
    expect(() => validate(d)).toThrow();
  });
});

describe("forecast integrity on selection changes", () => {
  it("retains historical payments on unselected alternatives", () => {
    const t = {
      ...emptyTrip(),
      hotels: [
        {
          ...blankHotel(),
          name: "Old stay",
          nightly: 100,
          selected: false,
          paid: 200,
          refunded: 50,
        },
        { ...blankHotel(), name: "New stay", nightly: 200, selected: true },
      ],
    };
    expect(totals(t)).toMatchObject({ estimated: 750, paid: 150, hotels: 750 });
  });
  it("does not project less than the amount already paid", () => {
    const t = {
      ...emptyTrip(),
      expenses: [{ ...blankExpense(), amount: 100, paid: 150 }],
    };
    expect(totals(t).estimated).toBe(150);
  });
});
