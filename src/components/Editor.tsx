import { ExpenseFields } from "./ExpenseFields";
import type { Expense, Activity } from "../lib/model";
import { hotelBreakdown } from "../lib/calc";
import type { Hotel } from "../lib/model";
import type { Currency, Store } from "../lib/model";
import { errorMessage } from "../lib/storage";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { bookingStatuses, categories, currencies } from "../lib/model";
export interface Field {
  key: string;
  label: string;
  type?:
    | "text"
    | "number"
    | "date"
    | "time"
    | "checkbox"
    | "textarea"
    | "select"
    | "url";
  options?: readonly string[];
  required?: boolean;
  nullable?: boolean;
  max?: number;
  hint?: string;
  layoverOnly?: boolean;
}
const f = (
  key: string,
  label: string,
  type: Field["type"] = "text",
  extra: Partial<Field> = {},
): Field => ({ key, label, type, ...extra });
const select = (key: string, label: string, options: readonly string[]) =>
  f(key, label, "select", { options });
const money = [
  select("currency", "Original currency", currencies),
  f("rate", "INR per currency unit", "number", {
    required: true,
    hint: "Snapshot rate for this record; not a live quote.",
  }),
];
const payments = [
  f("paid", "Amount paid (INR)", "number"),
  f("refunded", "Amount refunded (INR)", "number"),
];
const booking = [
  f("reference", "Booking reference"),
  f("url", "Booking URL", "url"),
  f("notes", "Notes", "textarea"),
];
export const fields: Record<string, Field[]> = {
  fareGroups: [
    select("ticketIssuance", "Ticket issuance", [
      "Awaiting ticketing",
      "Issued",
      "Unverified",
    ]),
    f("name", "Ticket name", "text", { required: true }),
    select("quoteStatus", "Quotation status", [
      "User search quote",
      "Older estimate — requote needed",
    ]),
    f("amount", "Total ticket fare", "number"),
    ...money,
    select("status", "Ticket booking status", bookingStatuses),
    ...payments,
    f("reference", "Ticket booking reference"),
    f("passengers", "Passengers", "number"),
    f("cabin", "Cabin"),
    f("notes", "Ticket notes", "textarea"),
  ],
  layovers: [
    f("date", "Confirmed layover date", "date"),
    select("direction", "Confirmed journey direction", [
      "Unknown",
      "Outbound",
      "Inbound",
    ]),
    f("arrivalTime", "Singapore arrival local time", "time", {
      required: true,
    }),
    f("departureTime", "Singapore departure local time", "time", {
      required: true,
    }),
    f("arrivalTerminal", "Arrival terminal"),
    f("departureTerminal", "Departure terminal"),
    select("entry", "Entry permission verification", [
      "Verification pending",
      "Verified permitted",
      "Not permitted",
    ]),
    select("baggage", "Baggage checked through", ["Unknown", "Yes", "No"]),
    select("protectedConnection", "Protected connection verified", [
      "Unknown",
      "Yes",
      "No",
    ]),
    select("additionalCheckIn", "Additional airline check-in required", [
      "Unknown",
      "Yes",
      "No",
    ]),
    f("airlineUrl", "Official airline guidance URL", "url"),
    f("notes", "Transit notes", "textarea"),
  ],
  trip: [
    f("name", "Trip name", "text", { required: true }),
    f("departure", "Departure city"),
    f("start", "Start date", "date", { required: true }),
    f("end", "End date", "date", { required: true }),
    f("travellers", "Travellers", "number", { required: true }),
    select("homeCurrency", "Display currency", currencies),
    f("budget", "Budget (INR)", "number"),
    f("stretch", "Stretch budget (INR)", "number"),
    f("accommodationBudget", "Preferred accommodation budget (INR)", "number"),
    select("status", "Trip status", [
      "Planning",
      "Confirmed",
      "In Progress",
      "Completed",
    ]),
  ],
  stops: [
    f("name", "Destination", "text", { required: true }),
    f("country", "Country"),
    f("start", "Arrival", "date"),
    f("end", "Departure", "date"),
  ],
  expenses: [
    f("description", "Description", "text", { required: true }),
    f("destination", "Destination"),
    select("category", "Category", categories),
    f("date", "Date", "date"),
    ...money,
    f("amount", "Original amount", "number"),
    ...payments,
    f(
      "includeInBudget",
      "Include this transit estimate in the budget",
      "checkbox",
      { layoverOnly: true },
    ),
    f("costPending", "Price estimate pending", "checkbox", {
      layoverOnly: true,
    }),
    select("bookingStatus", "Booking status", bookingStatuses),
    f("refundable", "Refundable", "checkbox"),
    f("vendor", "Vendor / provider"),
    ...booking,
    f("receipt", "Receipt / attachment reference"),
  ],
  hotels: [
    f("name", "Hotel name", "text", { required: true }),
    f("destination", "Destination", "text", { required: true }),
    f("checkIn", "Check-in", "date", { required: true }),
    f("checkOut", "Check-out", "date", { required: true }),
    f("room", "Room type / verification"),
    ...money,
    f("bookingAmountINR", "Fixed booking total paid/quoted (INR)", "number", {
      hint: "Optional fixed INR booking subtotal; overrides nightly multiplication. Excludes property charges.",
    }),
    select("propertyCurrency", "Property charges currency", currencies),
    f("propertyRate", "Property charges rate (INR per unit)", "number"),
    f("nightly", "Price per night", "number", {
      nullable: true,
      hint: "Leave empty if price is pending.",
    }),
    select("taxMode", "Displayed price tax model", ["Included", "Separate"]),
    f("taxes", "General taxes & fees (whole stay)", "number", {
      hint: "Separate adds this amount once per stay. Included means it is already in the nightly price; switch to Separate to add an extra tax.",
    }),
    select("propertyTaxBasis", "Tourism & heritage tax basis", [
      "Whole stay",
      "Per night",
    ]),
    f("tourismTax", "Tourism tax (paid at hotel)", "number", {
      hint: "Enter the total for all nights in the original currency. Whole stay adds it once.",
    }),
    f("heritageTax", "Heritage tax (paid at hotel)", "number", {
      hint: "Enter the total for all nights in the original currency. Use Per night only for a nightly quote.",
    }),
    f("propertyFees", "Other fees at property (whole stay)", "number", {
      hint: "Only amounts not already included above.",
    }),
    f("breakfast", "Breakfast verified included", "checkbox"),
    f("freeCancellation", "Free cancellation verified", "checkbox"),
    f("cancellationDeadline", "Cancellation deadline", "date"),
    f("bathroom", "Private bathroom verified", "checkbox"),
    f("window", "Window verified", "checkbox"),
    f("rating", "Review score / 10", "number", { nullable: true, max: 10 }),
    f("cleanliness", "Cleanliness score / 10", "number", {
      nullable: true,
      max: 10,
    }),
    f("distance", "Distance from attractions (km)", "number", {
      nullable: true,
    }),
    f("website", "Booking website"),
    f("url", "Booking URL", "url"),
    select("status", "Booking status", bookingStatuses),
    ...payments,
    f("notes", "Notes & unverified conditions", "textarea"),
  ],
  transport: [
    f("source", "Source / airport code", "text", { required: true }),
    f("destination", "Destination / airport code", "text", { required: true }),
    f("departureDate", "Departure date", "date"),
    f("departureTime", "Departure local time", "time"),
    f("arrivalDate", "Arrival date", "date"),
    f("arrivalTime", "Arrival local time", "time"),
    select("mode", "Mode", [
      "International flight",
      "Domestic flight",
      "Regional flight",
      "Bus",
      "Train",
      "Ferry",
      "Taxi",
      "Grab",
      "Airport shuttle",
    ]),
    f("provider", "Provider"),
    f("operatingCarrier", "Operating airline"),
    f("aircraft", "Aircraft"),
    f("bookingPlatform", "Booking platform"),
    f("cabinClass", "Cabin class"),
    f("fareType", "Fare type / conditions"),
    select("quoteStatus", "Quotation status", [
      "User search quote",
      "Older estimate — requote needed",
    ]),
    f("number", "Flight / train / bus number"),
    f("departureTerminal", "Departure terminal"),
    f("arrivalTerminal", "Arrival terminal"),
    ...money,
    f("fare", "Base fare", "number"),
    f("taxes", "Taxes", "number"),
    f("baggage", "Baggage charges", "number"),
    f("cabinBaggagePieces", "Cabin / handbag pieces", "number", {
      nullable: true,
    }),
    f("cabinBaggageKg", "Cabin / handbag allowance (kg)", "number", {
      nullable: true,
    }),
    f("checkedBaggageKg", "Checked baggage allowance (kg)", "number", {
      nullable: true,
    }),
    f("seat", "Seat selection charges", "number"),
    f("refundable", "Refundable", "checkbox"),
    select("status", "Booking status", bookingStatuses),
    ...payments,
    ...booking,
  ],
  activities: [
    f("name", "Activity name", "text", { required: true }),
    f("date", "Date", "date", { required: true }),
    f("start", "Start time", "time"),
    f("end", "End time", "time"),
    f("destination", "Destination"),
    select("category", "Category", [
      "Sightseeing",
      "Culture",
      "Nature",
      "Adventure",
      "Shopping",
      "Food",
      "Relaxation",
      "Transportation",
    ]),
    f("cost", "Estimated cost (INR)", "number"),
    f("costPending", "Price estimate pending", "checkbox", {
      layoverOnly: true,
    }),
    f(
      "includeInBudget",
      "Include optional excursion in plan and budget",
      "checkbox",
      { layoverOnly: true },
    ),
    f("bookingRequired", "Booking required", "checkbox"),
    f("transport", "Transport requirements"),
    select("status", "Status", ["Planned", "Booked", "Completed", "Cancelled"]),
    f("notes", "Notes", "textarea"),
  ],
  checklist: [
    f("title", "Checklist item", "text", { required: true }),
    select("status", "Status", ["To do", "In progress", "Done"]),
    select("priority", "Priority", ["Low", "Medium", "High"]),
    f("due", "Due date", "date"),
    f("related", "Related booking / expense ID"),
    f("notes", "Notes", "textarea"),
  ],
};
export function Editor({
  title,
  initial,
  kind,
  onClose,
  onSave,
  rates,
  creating = false,
  expenseOptions = [],
  activityOptions = [],
}: {
  title: string;
  initial: object;
  kind: string;
  onClose: () => void;
  onSave: (v: unknown) => void;
  rates: Store["rates"];
  creating?: boolean;
  expenseOptions?: Expense[];
  activityOptions?: Activity[];
}) {
  const modalRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = modalRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea,a[href]",
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = priorOverflow;
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [onClose]);
  const [value, setValue] = useState<Record<string, unknown>>({
    ...initial,
    ...(kind === "hotels"
      ? {
          propertyTaxBasis: (initial as Hotel).propertyTaxBasis ?? "Whole stay",
        }
      : {}),
  });
  const [error, setError] = useState("");
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={modalRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-title"
      >
        <header>
          <div>
            <span className="eyebrow">MAKE IT YOURS</span>
            <h2 id="edit-title">{title}</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close editor"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            try {
              onSave(value);
            } catch (err) {
              setError(errorMessage(err));
            }
          }}
        >
          {kind === "transport" && !!value.fareGroupId && (
            <p className="notice">
              This leg belongs to a shared ticket. Edit fare, booking status,
              reference and payments on the ticket card. Individual-leg pricing
              is unknown.
            </p>
          )}
          <div className="form-grid">
            {kind === "expenses" ? (
              <ExpenseFields
                value={value as unknown as Expense}
                onChange={(e) =>
                  setValue(e as unknown as Record<string, unknown>)
                }
                rates={rates}
                creating={creating}
                expenses={expenseOptions}
                activities={activityOptions}
              />
            ) : (
              fields[kind]
                .filter(
                  (field) =>
                    (!field.layoverOnly || value.layoverId) &&
                    (![
                      "bookingAmountINR",
                      "propertyCurrency",
                      "propertyRate",
                    ].includes(field.key) ||
                      value.bookingAmountINR !== undefined) &&
                    (field.key !== "ticketIssuance" ||
                      value.ticketIssuance !== undefined),
                )
                .map((field) => (
                  <label
                    className={field.type === "textarea" ? "span-2" : ""}
                    key={field.key}
                  >
                    {field.type === "checkbox" ? (
                      <span className="checkbox-field">
                        <input
                          type="checkbox"
                          checked={Boolean(value[field.key])}
                          onChange={(e) =>
                            setValue({
                              ...value,
                              [field.key]: e.target.checked,
                            })
                          }
                        />
                        {field.label}
                      </span>
                    ) : (
                      <>
                        <span>{field.label}</span>
                        {field.type === "select" ? (
                          <select
                            disabled={
                              kind === "transport" &&
                              !!value.fareGroupId &&
                              ["status", "currency"].includes(field.key)
                            }
                            aria-label={field.label}
                            value={String(value[field.key] ?? "")}
                            onChange={(e) =>
                              setValue({
                                ...value,
                                [field.key]: e.target.value,
                                ...(field.key === "currency"
                                  ? { rate: rates[e.target.value as Currency] }
                                  : field.key === "propertyCurrency"
                                    ? {
                                        propertyRate:
                                          rates[e.target.value as Currency],
                                      }
                                    : {}),
                              })
                            }
                          >
                            {field.options?.map((o) => (
                              <option key={o} value={o}>
                                {kind === "activities" && o === "Booked"
                                  ? "Reserved"
                                  : o}
                              </option>
                            ))}
                          </select>
                        ) : field.type === "textarea" ? (
                          <textarea
                            aria-label={field.label}
                            rows={3}
                            value={String(value[field.key] ?? "")}
                            onChange={(e) =>
                              setValue({
                                ...value,
                                [field.key]: e.target.value,
                              })
                            }
                          />
                        ) : (
                          <input
                            aria-label={field.label}
                            autoFocus={field === fields[kind][0]}
                            type={field.type ?? "text"}
                            disabled={
                              (field.key === "rate" &&
                                value.currency === "INR") ||
                              (kind === "hotels" &&
                                field.key === "taxes" &&
                                value.taxMode === "Included") ||
                              (kind === "transport" &&
                                !!value.fareGroupId &&
                                [
                                  "fare",
                                  "taxes",
                                  "baggage",
                                  "seat",
                                  "paid",
                                  "refunded",
                                  "currency",
                                  "rate",
                                  "reference",
                                ].includes(field.key))
                            }
                            min={field.type === "number" ? 0 : undefined}
                            max={field.max}
                            step={field.type === "number" ? "any" : undefined}
                            required={
                              field.required &&
                              !(field.key === "date" && value.layoverId)
                            }
                            value={String(value[field.key] ?? "")}
                            onChange={(e) =>
                              setValue({
                                ...value,
                                ...(["cost", "amount"].includes(field.key) &&
                                value.layoverId
                                  ? { costPending: false }
                                  : {}),
                                [field.key]:
                                  field.type === "number"
                                    ? e.target.value === "" && field.nullable
                                      ? null
                                      : Number(e.target.value)
                                    : e.target.value,
                              })
                            }
                          />
                        )}
                      </>
                    )}
                    {field.hint && <small>{field.hint}</small>}
                  </label>
                ))
            )}
          </div>
          {kind === "hotels" && (
            <HotelTaxPreview hotel={value as unknown as Hotel} />
          )}
          {error && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
          <footer>
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button className="button" type="submit">
              Save changes
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function HotelTaxPreview({ hotel }: { hotel: Hotel }) {
  const b = hotelBreakdown(hotel);
  const format = (n: number | null) =>
    n === null
      ? "Price pending"
      : new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 2,
        }).format(n);
  return (
    <section
      className="hotel-tax-preview"
      aria-label="Hotel cost preview"
      aria-live="polite"
    >
      <h3>{b.nights} nights · Cost breakdown (INR)</h3>
      <dl>
        <div>
          <dt>
            {hotel.bookingAmountINR !== undefined
              ? "Fixed INR booking subtotal"
              : `Room × ${b.nights} nights`}
          </dt>
          <dd>{format(b.room)}</dd>
        </div>
        <div>
          <dt>
            General tax{" "}
            {hotel.taxMode === "Included"
              ? "(already included)"
              : "(added once)"}
          </dt>
          <dd>{format(b.generalTax)}</dd>
        </div>
        <div>
          <dt>
            Tourism tax{" "}
            {hotel.propertyTaxBasis === "Per night"
              ? `× ${b.nights} nights`
              : "(whole stay)"}
          </dt>
          <dd>{format(b.tourismTax)}</dd>
        </div>
        <div>
          <dt>
            Heritage tax{" "}
            {hotel.propertyTaxBasis === "Per night"
              ? `× ${b.nights} nights`
              : "(whole stay)"}
          </dt>
          <dd>{format(b.heritageTax)}</dd>
        </div>
        <div>
          <dt>Other property fees (whole stay)</dt>
          <dd>{format(b.propertyFees)}</dd>
        </div>
        <div>
          <dt>Payable in person at hotel</dt>
          <dd>{format(b.atProperty)}</dd>
        </div>
        <div>
          <dt>Total stay cost, including property charges</dt>
          <dd>{format(b.total)}</dd>
        </div>
      </dl>
      <p>
        Property charges are included in the total, not added again as a second
        expense. Record payments when you actually pay.
      </p>
    </section>
  );
}
