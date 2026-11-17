import {
  convert,
  expenseTotal,
  ledger,
  netPaid,
  paymentState,
  rowForecast,
  totals,
} from "./calc";
import type { Expense, Trip } from "./model";
export const everydayCategories = [
  "Food",
  "Shopping",
  "Local transportation",
  "Airport transfers",
  "Miscellaneous",
];
export const isEveryday = (category: string) =>
  everydayCategories.includes(category);
export function expenseStatus(e: Expense) {
  if (e.bookingStatus === "Cancelled") return "Cancelled";
  const state = paymentState(expenseTotal(e), e.paid, e.refunded);
  return isEveryday(e.category)
    ? state === "Paid"
      ? "Spent"
      : state === "Unpaid"
        ? "Estimated"
        : state === "Partially Paid"
          ? "Partially spent"
          : state
    : state;
}
export function reservationLabel(category: string, status: string) {
  if (isEveryday(category))
    return status === "Booked"
      ? "Legacy booking"
      : status === "Cancelled"
        ? "Cancelled"
        : "—";
  return ["Attractions", "Adventure activities"].includes(category) &&
    status === "Booked"
    ? "Reserved"
    : status;
}
export function allowanceUsage(t: Trip, e: Expense) {
  const children = t.expenses.filter((c) => c.allowanceId === e.id);
  const paid = convert(
    netPaid(e.paid, e.refunded) +
      children.reduce((s, c) => s + netPaid(c.paid, c.refunded), 0),
    1,
  );
  return {
    target: expenseTotal(e),
    paid,
    remaining: convert(Math.max(0, expenseTotal(e) - paid), 1),
    overrun: convert(Math.max(0, paid - expenseTotal(e)), 1),
    count: children.length,
  };
}
const categoryName = (category: string) =>
  category.includes("flights")
    ? "Flights"
    : category === "Hotels"
      ? "Hotels"
      : category === "Food"
        ? "Food"
        : ["Attractions", "Adventure activities"].includes(category)
          ? "Activities"
          : category === "Shopping"
            ? "Shopping"
            : ["Airport transfers", "Local transportation"].includes(category)
              ? "Local transportation"
              : category === "Emergency/contingency"
                ? "Contingency"
                : "Miscellaneous";
export function reconciliation(t: Trip) {
  const rows = ledger(t);
  const group = (
    key: (r: (typeof rows)[number]) => string,
    includeEmpty = false,
  ) => {
    const names = includeEmpty
      ? [
          "Flights",
          "Hotels",
          "Food",
          "Activities",
          "Shopping",
          "Local transportation",
          "Miscellaneous",
          "Contingency",
        ]
      : [...new Set(rows.map(key))];
    return names
      .map((name) => {
        const records = rows.filter(
          (r) => key(r) === name && (rowForecast(r) > 0 || r.paid > 0),
        );
        const forecast = convert(
            records.reduce((s, r) => s + rowForecast(r), 0),
            1,
          ),
          paid = convert(
            records.reduce((s, r) => s + r.paid, 0),
            1,
          );
        return {
          name,
          forecast,
          paid,
          remaining: convert(Math.max(0, forecast - paid), 1),
          records,
        };
      })
      .filter((g) => includeEmpty || g.forecast || g.paid);
  };
  return {
    summary: totals(t),
    categories: group((r) => categoryName(r.category), true),
    sources: group((r) =>
      r.category.includes("flights")
        ? "Flights"
        : r.category === "Hotels"
          ? "Selected / retained hotels"
          : ["Airport transfers", "Local transportation"].includes(r.category)
            ? "Local / airport transportation"
            : r.source === "Activities"
              ? "Itinerary activities"
              : "Expenses module (other categories)",
    ),
    expensesContribution: convert(
      rows
        .filter((r) => r.source === "Expenses")
        .reduce((s, r) => s + rowForecast(r), 0),
      1,
    ),
    expensesPaid: convert(
      t.expenses.reduce((s, e) => s + netPaid(e.paid, e.refunded), 0),
      1,
    ),
  };
}

export function applyPaymentSnapshot(
  e: Expense,
  snapshot: import("./model").PaymentSnapshot,
  kind: "payment" | "refund",
): Expense {
  const inr = Math.round(snapshot.amount * snapshot.rate * 100) / 100;
  return kind === "payment"
    ? { ...e, paid: inr, paymentSnapshot: snapshot }
    : { ...e, refunded: inr, refundSnapshot: snapshot };
}
export function markExpenseSpent(e: Expense): Expense {
  return applyPaymentSnapshot(
    e,
    { currency: e.currency, amount: e.amount, rate: e.rate },
    "payment",
  );
}
