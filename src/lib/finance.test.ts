import { describe, it, expect } from "vitest";
import { seed, publishedSnapshotSeed, blankExpense } from "./seed";
import { migrateStore } from "./februaryFlights";
import { correctDefaultHotelDates } from "./defaultData";
import {
  applyPaymentSnapshot,
  markExpenseSpent,
  reconciliation,
  allowanceUsage,
  expenseStatus,
  reservationLabel,
} from "./finance";
import {
  totals,
  ledger,
  rowForecast,
  hotelTotal,
  daysBetween,
  groupBy,
} from "./calc";
import { costOverview } from "./overview";
import { validate } from "./storage";
import type { Expense } from "./model";
const expense = (patch: Partial<Expense> = {}): Expense => ({
  ...blankExpense(),
  kind: "Item",
  description: "Test item",
  amount: 1000,
  ...patch,
});
describe("financial accounting and source defaults", () => {
  it("corrects both source hotel sets once without changing any other hotel value or flight", () => {
    const old = migrateStore(publishedSnapshotSeed()),
      current = seed();
    current.trips.forEach((t, i) => {
      const before = old.trips[i],
        corrected = correctDefaultHotelDates(before);
      expect(t.hotels).toEqual(corrected.hotels);
      expect(correctDefaultHotelDates(corrected)).toBe(corrected);
      expect(t.hotels.map(hotelTotal)).toEqual(before.hotels.map(hotelTotal));
      t.hotels.forEach((h, j) => {
        const previous = before.hotels[j];
        expect(daysBetween(h.checkIn, h.checkOut)).toBe(
          daysBetween(previous.checkIn, previous.checkOut),
        );
        expect({
          ...h,
          checkIn: previous.checkIn,
          checkOut: previous.checkOut,
        }).toEqual(previous);
        expect(
          t.stops.some(
            (s) =>
              s.name === h.destination &&
              s.start === h.checkIn &&
              s.end === h.checkOut,
          ),
        ).toBe(true);
      });
      expect(t.transport).toEqual(before.transport);
      expect(t.fareGroups).toEqual(before.fareGroups);
      expect(totals(t).estimated).toBe(totals(before).estimated);
    });
    expect(validate(JSON.parse(JSON.stringify(current)))).toEqual(current);
  });
  it.each([
    ["MYR", 30, 19, 570],
    ["SGD", 10, 64, 640],
    ["INR", 30, 1, 30],
  ] as const)(
    "converts %s payment exactly once",
    (currency, amount, rate, inr) => {
      const e = markExpenseSpent(expense({ currency, amount, rate }));
      expect(e.paid).toBe(inr);
      expect(e.paymentSnapshot).toEqual({ currency, amount, rate });
      const s = seed();
      s.trips[0].expenses.push(e);
      expect(validate(s).trips[0].expenses.at(-1)?.paid).toBe(inr);
      const changed = structuredClone(s);
      changed.rates.MYR = 99;
      changed.rates.SGD = 99;
      expect(totals(changed.trips[0]).paid).toBe(inr);
      expect(changed.trips[0].expenses.at(-1)?.paymentSnapshot?.rate).toBe(
        rate,
      );
    },
  );
  it("preserves legacy foreign-expense payments as INR and handles refund snapshots independently", () => {
    const e = expense({ currency: "MYR", amount: 30, rate: 19, paid: 30 });
    const s = seed();
    s.trips[0].expenses.push(e);
    expect(validate(s).trips[0].expenses.at(-1)?.paid).toBe(30);
    const paid = markExpenseSpent({ ...e, paid: 0 }),
      refunded = applyPaymentSnapshot(
        paid,
        { currency: "MYR", amount: 10, rate: 20 },
        "refund",
      );
    expect(refunded.paid).toBe(570);
    expect(refunded.refunded).toBe(200);
    expect(refunded.paymentSnapshot?.rate).toBe(19);
    expect(refunded.refundSnapshot?.rate).toBe(20);
    s.trips[0].expenses = [refunded];
    const before = totals({ ...s.trips[0], expenses: [] });
    expect(totals(s.trips[0]).paid - before.paid).toBe(370);
  });
  it("adds new unbudgeted spending once, but never adds payment to an existing estimate twice", () => {
    const t = seed().trips[0],
      before = totals(t),
      e = expense();
    const planned = { ...t, expenses: [...t.expenses, e] };
    const paid = { ...t, expenses: [...t.expenses, markExpenseSpent(e)] };
    expect(totals(planned).estimated).toBe(before.estimated + 1000);
    expect(totals(paid).estimated).toBe(totals(planned).estimated);
    expect(totals(paid).paid).toBe(before.paid + 1000);
    expect(totals(paid).remainingForecast).toBe(before.remainingForecast);
  });
  it("consumes an explicitly linked allowance, preserves unlinked additions, and reports an overrun", () => {
    const t = seed().trips[0],
      target = expense({ kind: "Allowance", amount: 5000 }),
      meal = markExpenseSpent(
        expense({ amount: 1000, allowanceId: target.id }),
      );
    const group = { ...t, expenses: [target, meal] },
      empty = { ...t, expenses: [] };
    expect(totals(group).estimated - totals(empty).estimated).toBe(5000);
    expect(totals(group).paid).toBe(1000);
    expect(allowanceUsage(group, target)).toMatchObject({
      target: 5000,
      paid: 1000,
      remaining: 4000,
      overrun: 0,
    });
    const extra = markExpenseSpent(expense({ amount: 1000 }));
    expect(
      totals({ ...group, expenses: [...group.expenses, extra] }).estimated -
        totals(group).estimated,
    ).toBe(1000);
    const exceeded = markExpenseSpent({ ...meal, amount: 6500 });
    const over = { ...group, expenses: [target, exceeded] };
    expect(totals(over).estimated - totals(empty).estimated).toBe(6500);
    expect(allowanceUsage(over, target).overrun).toBe(1500);
  });
  it("pays an existing itinerary activity through one linked record", () => {
    const t = seed().trips[0],
      a = t.activities.find((a) => a.cost > 0)!,
      before = totals(t);
    const payment = markExpenseSpent(
      expense({
        plannedActivityId: a.id,
        category: "Attractions",
        amount: a.cost,
      }),
    );
    const next = { ...t, expenses: [...t.expenses, payment] };
    expect(totals(next).estimated).toBe(before.estimated);
    expect(totals(next).paid).toBe(before.paid + a.cost);
    expect(ledger(next).find((r) => r.id === payment.id)?.paid).toBe(0);
    expect(ledger(next).find((r) => r.id === a.id)?.paid).toBe(a.cost);
    const s = seed();
    s.trips[0] = next;
    expect(validate(s)).toEqual(s);
    next.expenses.push({ ...payment, id: "duplicate-payment" });
    expect(() => validate({ ...s, trips: [next, s.trips[1]] })).toThrow(
      /duplicate/i,
    );
  });
  it("keeps unrecovered cancelled costs and unselected hotel payments without including their estimates", () => {
    const t = seed().trips[0],
      before = totals(t),
      e = expense({
        amount: 5000,
        bookingStatus: "Cancelled",
        paid: 1000,
        refunded: 200,
      });
    const h = t.hotels.find((h) => !h.selected)!;
    const next = {
      ...t,
      expenses: [...t.expenses, e],
      hotels: t.hotels.map((x) =>
        x.id === h.id ? { ...x, paid: 500, refunded: 100 } : x,
      ),
    };
    expect(totals(next).estimated - before.estimated).toBe(1200);
    expect(totals(next).paid - before.paid).toBe(1200);
    expect(
      ledger(next)
        .filter((r) => !r.active)
        .reduce((s, r) => s + rowForecast(r), 0),
    ).toBe(1200);
  });
  it("reconciles every category/source and identifies the actual 74,700 origin", () => {
    const t = seed().trips[0],
      r = reconciliation(t);
    expect(r.expensesContribution).toBe(33200);
    expect(
      ledger(t)
        .filter((r) => r.source === "Activities")
        .reduce((s, r) => s + rowForecast(r), 0),
    ).toBe(41500);
    expect(costOverview(t).other).toBe(74700);
    expect(r.summary.estimated).toBe(174482);
    for (const rows of [r.categories, r.sources]) {
      expect(rows.reduce((s, g) => s + g.forecast, 0)).toBe(
        r.summary.estimated,
      );
      expect(rows.reduce((s, g) => s + g.paid, 0)).toBe(r.summary.paid);
    }
    expect(groupBy(t, "category").reduce((s, g) => s + g.estimated, 0)).toBe(
      r.summary.estimated,
    );
  });
  it("uses everyday terminology without losing reservation or payment distinctions", () => {
    const food = expense();
    expect(expenseStatus(food)).toBe("Estimated");
    expect(expenseStatus(markExpenseSpent(food))).toBe("Spent");
    expect(expenseStatus({ ...food, paid: 200 })).toBe("Partially spent");
    expect(reservationLabel("Attractions", "Booked")).toBe("Reserved");
    expect(reservationLabel("International flights", "Booked")).toBe("Booked");
    expect(
      expenseStatus({ ...food, category: "International flights", paid: 1000 }),
    ).toBe("Paid");
  });
  it("keeps paise exact across summaries, paid totals and category reconciliation", () => {
    const t = seed().trips[0],
      a = markExpenseSpent(expense({ amount: 0.1 })),
      b = markExpenseSpent(expense({ amount: 0.2 }));
    const base = {
      ...t,
      hotels: [],
      transport: [],
      fareGroups: [],
      activities: [],
      expenses: [a, b],
    };
    expect(totals(base).estimated).toBe(0.3);
    expect(totals(base).paid).toBe(0.3);
    expect(reconciliation(base).expensesContribution).toBe(0.3);
    expect(
      reconciliation(base).categories.find((g) => g.name === "Food"),
    ).toMatchObject({
      forecast: 0.3,
      paid: 0.3,
      remaining: 0,
    });
  });
  it("attributes shopping activities to Shopping and keeps zero-spend dashboard categories visible", () => {
    const t = seed().trips[0];
    t.activities = [{ ...t.activities[0], category: "Shopping", cost: 125 }];
    t.expenses = [];
    t.hotels = [];
    t.transport = [];
    t.fareGroups = [];
    const r = reconciliation(t);
    expect(r.categories.find((g) => g.name === "Shopping")?.forecast).toBe(125);
    expect(r.categories.find((g) => g.name === "Food")?.forecast).toBe(0);
    expect(r.categories.reduce((s, g) => s + g.forecast, 0)).toBe(125);
  });
  it("rejects invalid allowance links and mismatched payment snapshots", () => {
    const s = seed(),
      e = expense({ allowanceId: "missing" });
    s.trips[0].expenses.push(e);
    expect(() => validate(s)).toThrow(/allowance/);
    e.allowanceId = undefined;
    e.paymentSnapshot = { currency: "MYR", amount: 30, rate: 19 };
    e.paid = 30;
    expect(() => validate(s)).toThrow(/snapshot/);
  });
});
