import { activityExpenseCategory } from "../lib/model";
import { useState } from "react";
import { expenseTotal, paymentState } from "../lib/calc";
import {
  isEveryday,
  reservationLabel,
  applyPaymentSnapshot,
} from "../lib/finance";
import { categories, currencies } from "../lib/model";
import type {
  Activity,
  Currency,
  Expense,
  PaymentSnapshot,
  Store,
} from "../lib/model";
export function ExpenseFields({
  value,
  onChange,
  rates,
  creating,
  expenses = [],
  activities = [],
}: {
  value: Expense;
  onChange: (e: Expense) => void;
  rates: Store["rates"];
  creating: boolean;
  expenses?: Expense[];
  activities?: Activity[];
}) {
  const [autoPaid, setAutoPaid] = useState(
    creating &&
      !value.layoverId &&
      isEveryday(value.category) &&
      value.kind !== "Allowance" &&
      !value.paid,
  );
  const reservationOptions =
    value.category === "Hotels"
      ? ["Shortlisted", "Planned", "Booked", "Cancelled"]
      : ["Planned", "Booked", "Cancelled"];
  if (!reservationOptions.includes(value.bookingStatus))
    reservationOptions.unshift(value.bookingStatus);
  const everyday = isEveryday(value.category) && value.kind !== "Allowance";
  const paidState = paymentState(
    expenseTotal(value),
    value.paid,
    value.refunded,
  );
  const retainedReservation =
    value.bookingStatus === "Cancelled" ? "Planned" : value.bookingStatus;
  const mode =
    value.bookingStatus === "Cancelled"
      ? "Cancelled"
      : autoPaid
        ? "Spent"
        : paidState === "Paid"
          ? "Spent"
          : paidState === "Unpaid"
            ? "Estimated"
            : "Custom";
  const change = (patch: Partial<Expense>, followAuto = true) => {
    const next = { ...value, ...patch };
    if (value.layoverId && "amount" in patch) next.costPending = false;
    if (
      autoPaid &&
      followAuto &&
      isEveryday(next.category) &&
      next.kind !== "Allowance" &&
      !next.refunded
    ) {
      next.paid = expenseTotal(next);
      next.paymentSnapshot = {
        currency: next.currency,
        amount: next.amount,
        rate: next.rate,
      };
    }
    onChange(next);
  };
  const input = (label: string, key: keyof Expense, type = "text") => (
    <label key={key}>
      <span>{label}</span>
      <input
        aria-label={label}
        type={type}
        value={String(value[key] ?? "")}
        min={type === "number" ? 0 : undefined}
        step="any"
        disabled={key === "rate" && value.currency === "INR"}
        required={key === "description"}
        onChange={(e) =>
          change({
            [key]: type === "number" ? Number(e.target.value) : e.target.value,
          })
        }
      />
    </label>
  );
  const snapshot = (which: "payment" | "refund") => {
    const isPay = which === "payment",
      key = isPay ? "paymentSnapshot" : "refundSnapshot",
      amountKey = isPay ? "paid" : "refunded";
    const snap = value[key] ?? {
      currency: "INR" as const,
      amount: value[amountKey],
      rate: 1,
    };
    const set = (next: PaymentSnapshot) => {
      setAutoPaid(false);
      onChange(applyPaymentSnapshot(value, next, which));
    };
    const label = isPay ? "Payment" : "Refund";
    return (
      <div className="payment-entry" key={which}>
        <label>
          <span>{label} currency</span>
          <select
            aria-label={`${label} currency`}
            value={snap.currency}
            onChange={(e) => {
              const currency = e.target.value as Currency,
                rate =
                  currency === "INR"
                    ? 1
                    : currency === value.currency
                      ? value.rate
                      : rates[currency];
              set({ currency, rate, amount: value[amountKey] / rate });
            }}
          >
            {currencies.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          <span>
            {isPay ? "Amount paid" : "Amount refunded"} ({snap.currency})
          </span>
          <input
            aria-label={`${isPay ? "Amount paid" : "Amount refunded"} (${snap.currency})`}
            type="number"
            min="0"
            step="any"
            value={snap.amount}
            onChange={(e) => set({ ...snap, amount: Number(e.target.value) })}
          />
        </label>
        <label>
          <span>
            {label} rate (INR/{snap.currency})
          </span>
          <input
            aria-label={`${label} rate (INR/${snap.currency})`}
            type="number"
            min="0.000001"
            step="any"
            disabled={snap.currency === "INR"}
            value={snap.rate}
            onChange={(e) => set({ ...snap, rate: Number(e.target.value) })}
          />
        </label>
        <p>
          {isPay ? "Paid" : "Refunded"} in INR:{" "}
          <strong>
            {new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
            }).format(value[amountKey])}
          </strong>{" "}
          · {snap.amount.toLocaleString("en-IN")} {snap.currency} × ₹{snap.rate}
          /{snap.currency}
        </p>
      </div>
    );
  };
  const budgetSource = value.allowanceId
    ? `allowance:${value.allowanceId}`
    : value.plannedActivityId
      ? `activity:${value.plannedActivityId}`
      : "";
  return (
    <>
      {input("Description", "description")}
      {input("Destination", "destination")}
      <label>
        <span>Category</span>
        <select
          aria-label="Category"
          value={value.category}
          onChange={(e) => {
            const category = e.target.value;
            const next = { ...value, category, allowanceId: undefined };
            if (creating && autoPaid) {
              if (isEveryday(category)) {
                next.paid = expenseTotal(next);
                next.paymentSnapshot = {
                  currency: next.currency,
                  amount: next.amount,
                  rate: next.rate,
                };
              } else {
                next.paid = 0;
                next.paymentSnapshot = undefined;
                setAutoPaid(false);
              }
            }
            if (
              creating &&
              !next.layoverId &&
              next.kind !== "Allowance" &&
              isEveryday(category) &&
              !value.paid &&
              !value.refunded &&
              !value.paymentSnapshot
            ) {
              setAutoPaid(true);
              next.paid = expenseTotal(next);
              next.paymentSnapshot = {
                currency: next.currency,
                amount: next.amount,
                rate: next.rate,
              };
            }
            onChange(next);
          }}
        >
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      {input("Date", "date", "date")}
      <label>
        <span>Record type</span>
        <select
          aria-label="Record type"
          value={value.kind ?? "Item"}
          onChange={(e) => {
            const kind = e.target.value as "Item" | "Allowance";
            const next = {
              ...value,
              kind,
              allowanceId: undefined,
              plannedActivityId: undefined,
            };
            if (creating && autoPaid && kind === "Allowance") {
              next.paid = 0;
              next.paymentSnapshot = undefined;
            }
            setAutoPaid(false);
            onChange(next);
          }}
        >
          <option value="Item">Itemized expense</option>
          <option value="Allowance">Budget allowance</option>
        </select>
      </label>
      {value.kind !== "Allowance" && (
        <label>
          <span>Budget source</span>
          <select
            aria-label="Budget source"
            value={budgetSource}
            onChange={(e) => {
              const selected = e.target.value;
              const next = {
                ...value,
                allowanceId: undefined as string | undefined,
                plannedActivityId: undefined as string | undefined,
              };
              if (selected.startsWith("allowance:"))
                next.allowanceId = selected.slice(10);
              if (selected.startsWith("activity:")) {
                next.plannedActivityId = selected.slice(9);
                const activity = activities.find(
                  (a) => a.id === next.plannedActivityId,
                );
                if (activity) {
                  next.category = activityExpenseCategory(activity.category);
                  if (!next.description)
                    next.description = `Payment: ${activity.name}`;
                  if (!next.amount) {
                    next.amount = activity.cost;
                    next.currency = "INR";
                    next.rate = 1;
                  }
                }
                setAutoPaid(false);
              }
              change(next, false);
            }}
          >
            <option value="">Additional / unbudgeted expense</option>
            {expenses
              .filter(
                (e) =>
                  e.kind === "Allowance" &&
                  e.id !== value.id &&
                  e.category === value.category,
              )
              .map((e) => (
                <option key={e.id} value={`allowance:${e.id}`}>
                  Use allowance: {e.description}
                </option>
              ))}
            {activities
              .filter(
                (a) =>
                  !a.retiredTransit &&
                  !expenses.some(
                    (e) => e.id !== value.id && e.plannedActivityId === a.id,
                  ),
              )
              .map((a) => (
                <option key={a.id} value={`activity:${a.id}`}>
                  Payment against activity: {a.name}
                </option>
              ))}
          </select>
          <small>
            Choose a link explicitly. Otherwise this is an additional cost, even
            in a category with an allowance.
          </small>
        </label>
      )}
      <label>
        <span>Original currency</span>
        <select
          aria-label="Original currency"
          value={value.currency}
          onChange={(e) => {
            const currency = e.target.value as Currency;
            change({
              currency,
              rate: currency === "INR" ? 1 : rates[currency],
            });
          }}
        >
          {currencies.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      {input("INR per currency unit", "rate", "number")}
      {input(
        value.kind === "Allowance" ? "Allowance amount" : "Original amount",
        "amount",
        "number",
      )}
      <p className="span-2">
        INR-converted{" "}
        {value.kind === "Allowance" ? "allowance target" : "estimate"}:{" "}
        <strong>₹{expenseTotal(value).toLocaleString("en-IN")}</strong>. The
        rate is saved with this record; changing global rates does not change
        it.
      </p>
      {everyday ? (
        <label>
          <span>Spending status</span>
          <select
            aria-label="Spending status"
            value={mode}
            onChange={(e) => {
              if (e.target.value === "Cancelled") {
                setAutoPaid(false);
                change({ bookingStatus: "Cancelled" }, false);
              } else if (e.target.value === "Spent" && !value.refunded) {
                setAutoPaid(true);
                change(
                  {
                    bookingStatus: retainedReservation,
                    paid: expenseTotal(value),
                    paymentSnapshot: {
                      currency: value.currency,
                      amount: value.amount,
                      rate: value.rate,
                    },
                  },
                  false,
                );
              } else if (e.target.value === "Estimated") {
                setAutoPaid(false);
                if (value.refunded) {
                  return;
                }
                change(
                  {
                    bookingStatus: retainedReservation,
                    paid: 0,
                    paymentSnapshot: undefined,
                  },
                  false,
                );
              } else {
                setAutoPaid(false);
                change({ bookingStatus: retainedReservation }, false);
              }
            }}
          >
            <option>Spent</option>
            <option>Estimated</option>
            {(!creating || value.bookingStatus === "Cancelled") && (
              <option>Cancelled</option>
            )}
            {(mode === "Custom" || value.refunded > 0) && (
              <option value="Custom">Custom payment / refund</option>
            )}
          </select>
          {value.refunded > 0 && (
            <small>
              Refund history is preserved. Edit payment and refund totals
              explicitly.
            </small>
          )}
        </label>
      ) : (
        <label>
          <span>
            {value.kind === "Allowance" ? "Planning status" : "Booking status"}
          </span>
          <select
            aria-label={
              value.kind === "Allowance" ? "Planning status" : "Booking status"
            }
            value={value.bookingStatus}
            onChange={(e) => change({ bookingStatus: e.target.value }, false)}
          >
            {reservationOptions.map((s) => (
              <option key={s} value={s}>
                {reservationLabel(value.category, s) === "—"
                  ? s
                  : reservationLabel(value.category, s)}
              </option>
            ))}
          </select>
        </label>
      )}
      {everyday && value.bookingStatus === "Booked" && (
        <p>
          Legacy reservation status: Booked. This historical booking has been
          retained.
        </p>
      )}
      <fieldset className="span-2 payment-fields">
        <legend>Payments and refunds</legend>
        <p>
          These are totals already paid, not extra costs. Select the currency
          actually paid; the INR equivalent is stored once.
        </p>
        {snapshot("payment")}
        {snapshot("refund")}
        {!creating &&
          value.currency !== "INR" &&
          value.paid > 0 &&
          !value.paymentSnapshot && (
            <p className="notice">
              This older payment was saved as INR and has not been converted
              again. If it was entered in another currency, select that currency
              and correct the amount explicitly.
            </p>
          )}
      </fieldset>
      {input("Vendor / provider", "vendor")}
      {input(everyday ? "Reference" : "Booking reference", "reference")}
      {input("Booking URL", "url", "url")}
      {input("Receipt / attachment reference", "receipt")}
      <label className="span-2">
        <span>Notes</span>
        <textarea
          aria-label="Notes"
          rows={3}
          value={value.notes}
          onChange={(e) => change({ notes: e.target.value }, false)}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={value.refundable}
          onChange={(e) => change({ refundable: e.target.checked }, false)}
        />
        Refundable
      </label>
      {value.layoverId && (
        <label>
          <input
            type="checkbox"
            checked={value.includeInBudget !== false}
            onChange={(e) =>
              change({ includeInBudget: e.target.checked }, false)
            }
          />
          Include this transit estimate in the budget
        </label>
      )}
      {value.layoverId && (
        <label>
          <input
            type="checkbox"
            checked={!!value.costPending}
            onChange={(e) => change({ costPending: e.target.checked }, false)}
          />
          Price estimate pending
        </label>
      )}
    </>
  );
}
