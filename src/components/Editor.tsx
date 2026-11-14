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
  f("paid", "Total payments (INR)", "number"),
  f("refunded", "Total refunds (INR)", "number"),
];
const booking = [
  f("reference", "Booking reference"),
  f("url", "Booking URL", "url"),
  f("notes", "Notes", "textarea"),
];
export const fields: Record<string, Field[]> = {
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
    f("nightly", "Price per night", "number", {
      nullable: true,
      hint: "Leave empty if price is pending.",
    }),
    select("taxMode", "Displayed price tax model", ["Included", "Separate"]),
    f("taxes", "General taxes & fees (whole stay)", "number", {
      hint: "Added only when tax model is Separate.",
    }),
    f("tourismTax", "Separate tourism tax (whole stay)", "number"),
    f("heritageTax", "Separate heritage tax (whole stay)", "number"),
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
    f("departureDate", "Departure date", "date", { required: true }),
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
    f("number", "Flight / train / bus number"),
    f("departureTerminal", "Departure terminal"),
    f("arrivalTerminal", "Arrival terminal"),
    ...money,
    f("fare", "Base fare", "number"),
    f("taxes", "Taxes", "number"),
    f("baggage", "Baggage charges", "number"),
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
}: {
  title: string;
  initial: object;
  kind: string;
  onClose: () => void;
  onSave: (v: unknown) => void;
  rates: Store["rates"];
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
          "button:not(:disabled),input,select,textarea,a[href]",
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
  const [value, setValue] = useState<Record<string, unknown>>({ ...initial });
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
          <div className="form-grid">
            {fields[kind].map((field) => (
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
                        setValue({ ...value, [field.key]: e.target.checked })
                      }
                    />
                    {field.label}
                  </span>
                ) : (
                  <>
                    <span>{field.label}</span>
                    {field.type === "select" ? (
                      <select
                        aria-label={field.label}
                        value={String(value[field.key] ?? "")}
                        onChange={(e) =>
                          setValue({
                            ...value,
                            [field.key]: e.target.value,
                            ...(field.key === "currency"
                              ? { rate: rates[e.target.value as Currency] }
                              : {}),
                          })
                        }
                      >
                        {field.options?.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    ) : field.type === "textarea" ? (
                      <textarea
                        aria-label={field.label}
                        rows={3}
                        value={String(value[field.key] ?? "")}
                        onChange={(e) =>
                          setValue({ ...value, [field.key]: e.target.value })
                        }
                      />
                    ) : (
                      <input
                        aria-label={field.label}
                        autoFocus={field === fields[kind][0]}
                        type={field.type ?? "text"}
                        disabled={
                          field.key === "rate" && value.currency === "INR"
                        }
                        min={field.type === "number" ? 0 : undefined}
                        max={field.max}
                        step={field.type === "number" ? "any" : undefined}
                        required={field.required}
                        value={String(value[field.key] ?? "")}
                        onChange={(e) =>
                          setValue({
                            ...value,
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
            ))}
          </div>
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
